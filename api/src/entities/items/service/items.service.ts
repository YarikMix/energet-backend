import { Favourite } from '@entities/favourite/models/favourite.entity';
import { ItemsFiltersDto } from '@entities/items/dto/filters.dto';
import { PaginationDto } from '@entities/items/dto/pagination.dto';
import { ItemProducer } from '@entities/items/models/item-producer.entity';
import { ItemType } from '@entities/items/models/item-type.entity';
import { Item } from '@entities/items/models/item.entity';
import { E_ItemStatus } from '@entities/items/models/types';
import { OrderItem } from '@entities/order/models/order-item.entity';
import { Order } from '@entities/order/models/order.entity';
import { E_UserType } from '@entities/user/models/types';
import { User } from '@entities/user/models/user.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Equal,
  FindManyOptions,
  FindOneOptions,
  ILike,
  In,
  MoreThan,
  Repository,
} from 'typeorm';
import { DEFAULT_PAGE_SIZE } from '../../../utils/constants';
import { isNumeric } from '../../../utils/helpers';
import { CreateItemDto } from '../dto/createItem.dto';
import { UpdateItemDto } from '../dto/updateItem.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(ItemType)
    private readonly itemTypeRepository: Repository<ItemType>,
    @InjectRepository(ItemProducer)
    private readonly itemProducerRepository: Repository<ItemProducer>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Favourite)
    private readonly favouriteRepository: Repository<Favourite>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async search({
    name,
    types,
    producers,
    offset,
    limit,
    userId,
  }: PaginationDto & ItemsFiltersDto & { userId?: number }) {
    const filters = {};

    if (name) {
      filters['name'] = ILike(`%${name}%`);
    }

    if (types) {
      if (isNumeric(types)) {
        filters['item_type'] = {
          id: parseInt(types),
        };
      } else if (types.split(',').length > 1) {
        filters['item_type'] = In(types.split(',').map((i) => parseInt(i)));
      }
    }

    if (producers) {
      if (isNumeric(producers)) {
        filters['item_producer'] = {
          id: parseInt(producers),
        };
      } else if (producers.split(',').length > 1) {
        filters['item_producer'] = In(
          producers.split(',').map((i) => parseInt(i)),
        );
      }
    }

    filters['warehouse_count'] = MoreThan(0);

    // filters['status'] = Not(E_ItemStatus.Deleted);

    if (userId) {
      const user = await this.userRepository.findOneBy({ id: userId });
      if (user) {
        if (user.role != E_UserType.Buyer) {
          if (user.role == E_UserType.Producer) {
            filters['owner'] = Equal(userId);
          }

          const items = await this.itemRepository.find({
            relations: ['owner', 'item_type', 'item_producer'],
            select: {
              owner: {
                id: true,
                name: true,
              },
            },
            where: filters,
            order: {
              id: 'ASC',
            },
          } as FindManyOptions<Item>);

          return {
            items,
          };
        }
      }
    }

    let items = await this.itemRepository.find({
      relations: ['owner', 'item_type', 'item_producer'],
      select: {
        owner: {
          id: true,
          name: true,
        },
      },
      where: filters,
      skip: offset,
      take: limit ?? DEFAULT_PAGE_SIZE,
    } as FindManyOptions<Item>);

    if (userId) {
      const user = await this.userRepository.findOneBy({ id: userId });
      if (user && user.role == E_UserType.Buyer) {
        items = await Promise.all(
          items.map(async (item) => {
            const favourite = await this.favouriteRepository.exists({
              where: {
                itemId: item.id,
                ownerId: userId,
              },
            });
            return { ...item, favourite };
          }),
        );
      }
    }

    const totalCount = await this.itemRepository.count({ where: filters });

    return {
      items,
      total_pages: Math.ceil(totalCount / DEFAULT_PAGE_SIZE),
    };
  }

  async findOne(itemId: number, userId?: number) {
    const item = await this.itemRepository.findOne({
      where: { id: itemId },
      select: {
        owner: {
          id: true,
          name: true,
        },
      },
      relations: ['owner', 'item_type', 'item_producer'],
    } as FindOneOptions<Item>);

    if (userId) {
      const favourite = await this.favouriteRepository.exists({
        where: {
          itemId: item.id,
          ownerId: userId,
        },
      });
      return { ...item, favourite };
    }

    return item;
  }

  async findTypes() {
    return await this.itemTypeRepository.find();
  }

  async findProducers() {
    return await this.itemProducerRepository.find();
  }

  async remove(id: number) {
    return await this.itemRepository.delete(id);
  }

  async update(id: number, updateItemDto: UpdateItemDto) {
    await this.itemRepository.update({ id }, updateItemDto);
  }

  async delete(id: number) {
    const item = await this.itemRepository.findOneBy({ id });
    if (!item) throw new NotFoundException();
    item.status = E_ItemStatus.Deleted;
    return await this.itemRepository.save(item);
  }

  async create(createItemDto: CreateItemDto, ownerId: number, image?: string) {
    const itemData = this.itemRepository.create(createItemDto);

    itemData.owner = await this.userRepository.findOneBy({ id: ownerId });

    const item = await this.itemRepository.save(itemData);

    if (image) {
      await this.itemRepository.update(
        { id: item.id },
        { image: `items/${item.id}/${image}` },
      );
    }

    return item;
  }

  async updateImage(itemId: number, fileName?: string) {
    return await this.itemRepository.update(itemId, {
      image: `items/${itemId}/${fileName}`,
    });
  }

  async addItemToOrder(itemId: number, orderId: number) {
    const orderItem = await this.orderItemRepository.create({
      orderId: orderId,
      itemId: itemId,
    });

    await this.orderItemRepository.save(orderItem);

    const data = await this.orderRepository.findOne({
      where: {
        id: orderId,
      },
    });

    const itemsIds = await this.orderItemRepository.find({
      where: {
        orderId: orderId,
      },
      select: {
        itemId: true,
      },
    });

    const items = [];

    for (const item of itemsIds) {
      const itemData = await this.itemRepository.findOne({
        where: {
          id: item.itemId,
        },
      });
      items.push(itemData);
    }

    return { ...data, items };
  }

  async deleteItemFromOrder(itemId: number, orderId: number) {
    await this.orderItemRepository.delete({
      orderId: orderId,
      itemId: itemId,
    });

    const data = await this.orderRepository.findOne({
      where: {
        id: orderId,
      },
    });

    const itemsIds = await this.orderItemRepository.find({
      where: {
        orderId: orderId,
      },
      select: {
        itemId: true,
      },
    });

    const items = [];

    for (const item of itemsIds) {
      const itemData = await this.itemRepository.findOne({
        where: {
          id: item.itemId,
        },
      });
      items.push(itemData);
    }

    return { ...data, items };
  }

  async isFavouriteItem(itemId: number, ownerId: number) {
    return await this.favouriteRepository.exists({
      where: {
        itemId,
        ownerId,
      },
    });
  }

  async addItemToFavourite(itemId: number, ownerId: number) {
    const favourite = this.favouriteRepository.create({
      itemId,
      ownerId,
    });

    return await this.favouriteRepository.save(favourite);
  }

  async removeItemFromFavourite(itemId: number, ownerId: number) {
    return await this.favouriteRepository.delete({ ownerId, itemId });
  }
}

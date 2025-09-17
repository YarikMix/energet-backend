import { Draft } from '@entities/draft/models/draft.entity';
import { Favourite } from '@entities/favourite/models/favourite.entity';
import { ItemProducer } from '@entities/items/models/item-producer.entity';
import { ItemType } from '@entities/items/models/item-type.entity';
import { Item } from '@entities/items/models/item.entity';
import { OrderItem } from '@entities/order/models/order-item.entity';
import { Order } from '@entities/order/models/order.entity';
import { E_OrderStatus } from '@entities/order/models/types';
import { E_UserType } from '@entities/user/models/types';
import { User } from '@entities/user/models/user.entity';
import { faker } from '@faker-js/faker';
import { MinioService } from '@services/minio/minio.service';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import {
  BATTERY_MOCKS,
  DIESEL_GENERATOR_MOCKS,
  INVERTOR_MOCKS,
  ITEM_PRODUCERS,
  ITEMS_CATEGORIES,
  SOLAR_PANEL_MOCKS,
  TERMO_GENERATOR_MOCKS,
  WIND_GENERATOR_MOCKS,
} from '../utils/constants';
import { generateRandomFloat, generateRandomInt } from '../utils/helpers';

const ITEMS_COUNT = 51;
const ITEMS_IN_ORDER_COUNT = 3;
const USERS_COUNT = 10;
const MODERATORS_COUNT = 3;
const PRODUCERS_COUNT = 5;
const USER_ORDERS_COUNT = 5;
const USER_CONFIGURATOR_DRAFTS_COUNT = 5;
const FAVOURITES_FOR_USER_COUNT = 5;

export class MainSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    const { users, producers } = await this.generateUsers(
      factoryManager,
      dataSource,
    );

    const items = await this.generateItems(
      factoryManager,
      dataSource,
      producers,
    );

    await this.generateFavourites(factoryManager, dataSource, users, items);

    await this.generateOrders(factoryManager, dataSource, users, items);

    await this.generateDrafts(factoryManager, dataSource, users);
  }

  generateFavourites = async (
    factoryManager: SeederFactoryManager,
    dataSource: DataSource,
    users: User[],
    items: Item[],
  ) => {
    console.log('seeding favourites');

    const favouritesRepo = dataSource.getRepository(Favourite);
    const favouriteFactory = factoryManager.get(Favourite);

    await Promise.all(
      users.map(async (user) => {
        const randomItems = faker.helpers.arrayElements(
          items,
          FAVOURITES_FOR_USER_COUNT,
        );

        const favourites = await Promise.all(
          randomItems.map(async (item) => {
            return await favouriteFactory.make({
              itemId: item.id,
              ownerId: user.id,
            });
          }),
        );

        await favouritesRepo.save(favourites);
      }),
    );
  };

  generateUsers = async (
    factoryManager: SeederFactoryManager,
    dataSource: DataSource,
  ): Promise<{ users: User[]; producers: User[]; moderators: User[] }> => {
    console.log('seeding users');
    const userFactory = factoryManager.get(User);
    const usersRepo = dataSource.getRepository(User);

    // Создаем покупателей
    const testBuyer = await userFactory.make({
      email: 'user@user.com',
      role: E_UserType.Buyer,
    });
    testBuyer.password = await bcrypt.hash('1234', 10);
    await usersRepo.save(testBuyer);

    const users = await userFactory.saveMany(USERS_COUNT);

    // Создаем поставщиков
    const testProducer = await userFactory.make({
      email: 'user2@user.com',
      role: E_UserType.Producer,
    });
    testProducer.password = await bcrypt.hash('1234', 10);
    await usersRepo.save(testProducer);

    const producers = await userFactory.saveMany(PRODUCERS_COUNT, {
      role: E_UserType.Producer,
    });

    // Создаем модераторов
    const testModerator = await userFactory.make({
      email: 'user3@user.com',
      role: E_UserType.Moderator,
    });
    await usersRepo.save(testModerator);

    const moderators = await userFactory.saveMany(MODERATORS_COUNT, {
      role: E_UserType.Moderator,
    });

    return {
      users: [testBuyer, ...users],
      producers: [testProducer, ...producers],
      moderators: [testModerator, ...moderators],
    };
  };

  generateItems = async (
    factoryManager: SeederFactoryManager,
    dataSource: DataSource,
    producers: User[],
  ): Promise<Item[]> => {
    console.log('seeding items');
    const itemFactory = factoryManager.get(Item);
    const itemsRepo = dataSource.getRepository(Item);
    const itemsTypeFactory = factoryManager.get(ItemType);
    const itemsProducerRepo = dataSource.getRepository(ItemProducer);
    const itemsProducerFactory = factoryManager.get(ItemProducer);

    const itemsTypes = await Promise.all(
      ITEMS_CATEGORIES.map(async (name) => {
        return await itemsTypeFactory.save({
          name,
        });
      }),
    );

    console.log('itemsTypes', itemsTypes);

    let itemProducers = await Promise.all(
      ITEM_PRODUCERS.map(async (name) => {
        return await itemsProducerFactory.make({
          name,
        });
      }),
    );
    itemProducers = await itemsProducerRepo.save(itemProducers);

    const solarPanelPowerRange = [
      ...Array.from({ length: 7 }, (_, i) => 360 + i * 5),
      ...Array.from({ length: 8 }, (_, i) => 460 + i * 5),
    ]; // Самые распространенные 360-390, 460-495 с шагом 5

    const generatePrice = (power, k: number) =>
      Math.round(1000 * ((power / 500) * k) * generateRandomFloat(0.9, 1.1));

    const getRandomItemImage = (category: string, max = 4) => {
      return `items/${category}/${faker.helpers.rangeToNumber({ min: 1, max })}.png`;
    };

    const getItemNames = (item_type: number) => {
      switch (item_type) {
        case 1:
          return INVERTOR_MOCKS;
        case 2:
          return BATTERY_MOCKS;
        case 3:
          return SOLAR_PANEL_MOCKS;
        case 4:
          return WIND_GENERATOR_MOCKS;
        case 5:
          return TERMO_GENERATOR_MOCKS;
        case 6:
          return DIESEL_GENERATOR_MOCKS;
        default:
          return ['Название'];
      }
    };

    const generateItemName = (item_type: number) => {
      const names = getItemNames(item_type);

      return `${faker.helpers.arrayElement(names)} ${100 * generateRandomInt(10, 100)}`;
    };

    const items = await Promise.all(
      Array(ITEMS_COUNT)
        .fill('')
        .map(async () => {
          const item = await itemFactory.make({
            owner: faker.helpers.arrayElement(producers),
            item_type: faker.helpers.arrayElement(itemsTypes),
            item_producer: faker.helpers.arrayElement(itemProducers),
          });

          item.name = generateItemName(item.item_type.id);

          if (item.item_type.id == 1) {
            item.power = 500 * faker.helpers.rangeToNumber({ min: 1, max: 10 });
            item.price = generatePrice(item.power, 10);
            item.image = getRandomItemImage('invertor');
          } else if (item.item_type.id == 2) {
            item.power = 500 * faker.helpers.rangeToNumber({ min: 1, max: 4 });
            item.price = generatePrice(item.power, 4);
            item.image = getRandomItemImage('battery');
          } else if (item.item_type.id == 3) {
            item.power = faker.helpers.arrayElement(solarPanelPowerRange);
            item.price = generatePrice(item.power, 10);
            item.image = getRandomItemImage('solar');
          } else if (item.item_type.id == 4) {
            item.power = 500 * faker.helpers.rangeToNumber({ min: 1, max: 8 });
            item.price = generatePrice(item.power, 8);
            item.image = getRandomItemImage('wind_gen');
          } else if (item.item_type.id == 5) {
            item.power = 1000 * faker.helpers.rangeToNumber({ min: 1, max: 6 });
            item.price = generatePrice(item.power, 6);
            item.image = getRandomItemImage('termo_gen');
          } else if (item.item_type.id == 6) {
            item.power = 1000 * faker.helpers.rangeToNumber({ min: 1, max: 7 });
            item.price = generatePrice(item.power, 7);
            item.image = getRandomItemImage('diesel_gen');
          }

          return item;
        }),
    );

    const minio = new MinioService();
    await minio.uploadLocalFile(
      'items',
      'default.png',
      'src/assets/default.png',
    );

    await minio.uploadLocalFolder('items/invertor', 'src/assets/invertor');
    await minio.uploadLocalFolder('items/battery', 'src/assets/battery');
    await minio.uploadLocalFolder('items/solar', 'src/assets/solar');
    await minio.uploadLocalFolder('items/wind_gen', 'src/assets/wind_gen');
    await minio.uploadLocalFolder('items/termo_gen', 'src/assets/termo_gen');
    await minio.uploadLocalFolder('items/diesel_gen', 'src/assets/diesel_gen');

    return await itemsRepo.save(items);
  };

  generateOrders = async (
    factoryManager: SeederFactoryManager,
    dataSource: DataSource,
    users: User[],
    items: Item[],
  ) => {
    console.log('seeding orders');
    const orderFactory = factoryManager.get(Order);

    await Promise.all(
      users.map(async (user) => {
        // Создаем черновые заказы покупателю
        const draftOrder = await orderFactory.save({
          owner: user,
          status: E_OrderStatus.Draft,
        });

        // Создаем остальные заказы покупателю
        const orders = await orderFactory.saveMany(USER_ORDERS_COUNT, {
          owner: user,
        });

        // Наполняем заказы оборудованием
        const orderItemFactory = factoryManager.get(OrderItem);
        await Promise.all(
          [draftOrder, ...orders].map(async (order) => {
            const orderItems = faker.helpers.arrayElements(
              items,
              ITEMS_IN_ORDER_COUNT,
            );
            await Promise.all(
              orderItems.map(async (item) => {
                await orderItemFactory.save({
                  orderId: order.id,
                  itemId: item.id,
                });
              }),
            );
          }),
        );
      }),
    );
  };

  generateDrafts = async (
    factoryManager: SeederFactoryManager,
    dataSource: DataSource,
    users: User[],
  ) => {
    console.log('seeding drafts');
    const draftFactory = factoryManager.get(Draft);

    await Promise.all(
      users.map(async (user) => {
        await draftFactory.saveMany(USER_CONFIGURATOR_DRAFTS_COUNT, {
          owner: user,
        });
      }),
    );
  };
}

import { ItemsFiltersDto } from '@entities/items/dto/filters.dto';
import { PaginationDto } from '@entities/items/dto/pagination.dto';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '@services/auth/decorators/public.decorator';
import { User } from '@services/auth/decorators/user.decorator';
import { MinioService } from '@services/minio/minio.service';
import { CreateItemDto } from '../dto/createItem.dto';
import { UpdateItemDto } from '../dto/updateItem.dto';
import { ItemsService } from '../service/items.service';

@Controller('items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly minioService: MinioService,
  ) {}

  @Public()
  @Get('/types')
  getTypes() {
    return this.itemsService.findTypes();
  }

  @Public()
  @Get('/producers')
  getProducers() {
    return this.itemsService.findProducers();
  }

  @Public()
  @Get('/')
  searchItems(
    @Req() req,
    @Query() params: PaginationDto & ItemsFiltersDto,
    @User() user,
  ) {
    return this.itemsService.search({ ...params, userId: user?.id });
  }

  @Public()
  @Get('/:id')
  // @UseInterceptors(NotFoundInterceptor)
  getItem(@Param('id', ParseIntPipe) id: number, @User() user) {
    return this.itemsService.findOne(id, user?.id);
  }

  @Post('/')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  @UseInterceptors(FileInterceptor('image') as Function)
  async create(
    @User() owner,
    @Body() createItemDto: CreateItemDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    const item = await this.itemsService.create(
      createItemDto,
      owner.id,
      image && image.originalname,
    );

    if (image) await this.minioService.uploadFile(`/items/${item.id}/`, image);

    return item;
  }

  @Put('/:id/')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.itemsService.update(id, updateItemDto);
  }

  @Delete('/:id/')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.delete(id);
  }

  @Put('/:id/update_image/')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  @UseInterceptors(FileInterceptor('image') as Function)
  async updateImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() image: Express.Multer.File,
  ) {
    if (!image) {
      throw new BadRequestException();
    }

    await this.minioService.uploadFile(`/items/${id}/`, image);

    await this.itemsService.updateImage(id, image.originalname);

    return this.itemsService.findOne(id);
  }

  @Delete('/:id')
  remove(@Param('id') id: string) {
    return this.itemsService.remove(+id);
  }

  @Post('/:item_id/add_to_order/:order_id')
  addToOrder(
    @Param('item_id', ParseIntPipe) item_id: number,
    @Param('order_id', ParseIntPipe) order_id: number,
  ) {
    return this.itemsService.addItemToOrder(item_id, order_id);
  }

  @Post('/:item_id/delete_from_order/:order_id')
  deleteFromOrder(
    @Param('item_id', ParseIntPipe) item_id: number,
    @Param('order_id', ParseIntPipe) order_id: number,
  ) {
    return this.itemsService.deleteItemFromOrder(item_id, order_id);
  }

  @Post('/:id/add_to_favourites')
  async addItemToFavourite(
    @Res({ passthrough: true }) res,
    @Param('id') id: number,
    @User() user,
  ) {
    const isFavouriteItem = await this.itemsService.isFavouriteItem(
      id,
      user.id,
    );

    if (isFavouriteItem) {
      res.status(HttpStatus.CONFLICT).send();
      return;
    }

    return this.itemsService.addItemToFavourite(id, user.id);
  }

  @Delete('/:id/delete_from_favourites')
  removeItemFromFavourite(@Param('id') id: number, @User() user) {
    return this.itemsService.removeItemFromFavourite(id, user.id);
  }
}

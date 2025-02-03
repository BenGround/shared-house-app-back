import {
  AllowNull,
  BeforeCreate,
  BeforeUpdate,
  Column,
  DataType,
  HasMany,
  Model,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Booking } from '../booking/booking.model';

@Table
export class SharedSpace extends Model {
  @Unique
  @AllowNull(false)
  @Column
  nameCode!: string;

  @AllowNull(false)
  @Column
  nameEn!: string;

  @AllowNull(false)
  @Column
  nameJp!: string;

  @AllowNull(true)
  @Column
  descriptionEn: string = '';

  @AllowNull(true)
  @Column
  descriptionJp: string = '';

  @AllowNull(false)
  @Column
  startDayTime!: string;

  @AllowNull(false)
  @Column
  endDayTime!: string;

  @AllowNull(false)
  @Column
  maxBookingHours!: number;

  @AllowNull(false)
  @Column
  maxBookingByUser!: number;

  @HasMany(() => Booking)
  bookings?: Booking[];

  @AllowNull(true)
  @Column(DataType.STRING)
  picture?: String;

  @BeforeCreate
  @BeforeUpdate
  static beforeCreateHook(instance: SharedSpace): void {}
}

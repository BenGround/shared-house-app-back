import 'reflect-metadata';
import { AllowNull, Column, DataType, HasMany, Model, Table, Unique } from 'sequelize-typescript';
import { Booking } from '../booking/booking.model';

@Table
export class SharedSpace extends Model {
  @Unique('nameCode')
  @AllowNull(false)
  @Column(DataType.STRING)
  nameCode!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  nameEn!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  nameJp!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  descriptionEn: string = '';

  @AllowNull(true)
  @Column(DataType.STRING)
  descriptionJp: string = '';

  @AllowNull(false)
  @Column(DataType.STRING)
  startDayTime!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  endDayTime!: string;

  @AllowNull(false)
  @Column(DataType.NUMBER)
  maxBookingHours!: number;

  @AllowNull(false)
  @Column(DataType.NUMBER)
  maxBookingByUser!: number;

  @HasMany(() => Booking)
  bookings?: Booking[];

  @AllowNull(true)
  @Column(DataType.STRING)
  picture?: string;
}

import { AllowNull, BeforeCreate, BeforeUpdate, Column, HasMany, Model, Table, Unique } from 'sequelize-typescript';
import { Booking } from '../booking/booking.model';

@Table
export class SharedSpace extends Model {
  @Unique
  @AllowNull(false)
  @Column
  nameCode!: string;

  @AllowNull(true)
  @Column
  description: string = '';

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

  @BeforeCreate
  @BeforeUpdate
  static beforeCreateHook(instance: SharedSpace): void {}
}

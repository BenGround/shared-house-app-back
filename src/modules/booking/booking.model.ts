import { AllowNull, BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from '../user/user.model';
import { SharedSpace } from '../sharedSpace/sharedspace.model';

@Table
export class Booking extends Model {
  @AllowNull(false)
  @Column
  startDate!: Date;

  @AllowNull(false)
  @Column
  endDate!: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId!: number;

  @BelongsTo(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @ForeignKey(() => SharedSpace)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  sharedSpaceId!: number;

  @BelongsTo(() => SharedSpace, { onDelete: 'CASCADE' })
  sharedSpace!: SharedSpace;
}

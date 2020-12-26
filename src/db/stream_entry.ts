import { Model, DataTypes, Sequelize, BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin } from "sequelize"
import { User } from "./user"

export interface StreamAttributes {
    id: string,
    user_id: string,
    url: string,
    check_frequency: "EVERY_HOUR" | "EVERY_MINUTE"
}

export class Stream extends Model implements StreamAttributes {
    public id!: string
    public readonly createdAt!: Date
    public readonly updatedAt!: Date

    public user_id!: string
    public url!: string
    public check_frequency!: "EVERY_HOUR" | "EVERY_MINUTE"


    public CreateUser!: BelongsToCreateAssociationMixin<User>
    public GetUser!: BelongsToGetAssociationMixin<User>
    public SetUser!: BelongsToSetAssociationMixin<User, User['id']>

    public static initModel(sequelize: Sequelize): Model<Stream, {}> {
        return this.init({
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            user_id: { type: DataTypes.UUID, allowNull: false },
            url: { type: DataTypes.STRING, allowNull: false },
            check_frequency: { type: DataTypes.ENUM, values: ["EVERY_HOUR", "EVERY_MINUTE"], allowNull: false }
        }, {
            sequelize: sequelize,
            tableName: "streams"
        })
    }
}

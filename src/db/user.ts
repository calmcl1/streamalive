import {
    Model, DataTypes, Sequelize, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin,
    HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin
} from "sequelize"
import { Stream } from "./stream_entry"

export interface User {
    id: string,
    first_name: string
    last_name: string
}

export class User extends Model implements User {
    public id!: string
    public readonly createdAt!: Date
    public readonly updatedAt!: Date

    public first_name!: string
    public last_name!: string

    public AddStream!: HasManyAddAssociationMixin<Stream, Stream['id']>
    public AddStreams!: HasManyAddAssociationsMixin<Stream, Stream['id']>
    public CoundStream!: HasManyCountAssociationsMixin
    public CreateStream!: HasManyCreateAssociationMixin<Stream>
    public GetStreams!: HasManyGetAssociationsMixin<Stream>
    public HasStream!: HasManyHasAssociationMixin<Stream, Stream['id']>
    public HasStreams!: HasManyHasAssociationsMixin<Stream, Stream['id']>
    public RemoveStream!: HasManyRemoveAssociationMixin<Stream, Stream['id']>
    public RemoveStreams!: HasManyRemoveAssociationsMixin<Stream, Stream['id']>
    public SetStreams!: HasManySetAssociationsMixin<Stream, Stream['id']>

    public static initModel(sequelize: Sequelize): Model<User, {}> {
        return this.init({
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            first_name: { type: DataTypes.STRING, allowNull: false },
            last_name: { type: DataTypes.STRING, allowNull: false },
        }, {
            sequelize: sequelize,
            tableName: "users"
        })
    }
}

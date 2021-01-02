import { DataTypes, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin, Model, Sequelize } from "sequelize"
import { CHECK_FREQUENCY } from "../limits"
import { StreamState } from "./stream_state"

export interface StreamAttributes {
    id: string,
    user_id: string,
    url: string,
    check_frequency: CHECK_FREQUENCY
    notify_type: "EMAIL" | "SMS"
}

export class Stream extends Model implements StreamAttributes {
    public id!: string
    public readonly createdAt!: Date
    public readonly updatedAt!: Date

    public user_id!: string
    public url!: string
    public check_frequency!: CHECK_FREQUENCY
    public notify_type!: "EMAIL" | "SMS"

    // public CreateUser!: BelongsToCreateAssociationMixin<User>
    // public GetUser!: BelongsToGetAssociationMixin<User>
    // public SetUser!: BelongsToSetAssociationMixin<User, User['id']>
    public addStreamState!: HasManyAddAssociationMixin<StreamState, StreamState['id']>
    public addStreamStates!: HasManyAddAssociationsMixin<StreamState, StreamState['id']>
    public coundStreamState!: HasManyCountAssociationsMixin
    public createStreamState!: HasManyCreateAssociationMixin<StreamState>
    public getStreamStates!: HasManyGetAssociationsMixin<StreamState>
    public hasStreamState!: HasManyHasAssociationMixin<StreamState, StreamState['id']>
    public hasStreamStates!: HasManyHasAssociationsMixin<StreamState, StreamState['id']>
    public removeStreamState!: HasManyRemoveAssociationMixin<StreamState, StreamState['id']>
    public removeStreamStates!: HasManyRemoveAssociationsMixin<StreamState, StreamState['id']>
    public setStreamStates!: HasManySetAssociationsMixin<StreamState, StreamState['id']>

    public static initModel(sequelize: Sequelize): Model<Stream, {}> {
        return this.init({
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            user_id: { type: DataTypes.STRING, allowNull: false },
            url: { type: DataTypes.STRING, allowNull: false },
            check_frequency: { type: DataTypes.ENUM, values: Object.keys(CHECK_FREQUENCY), allowNull: false },
            notify_type: { type: DataTypes.ENUM, values: ["EMAIL", "SMS"], allowNull: false }
        }, {
            sequelize: sequelize,
            tableName: "streams"
        })
    }
}

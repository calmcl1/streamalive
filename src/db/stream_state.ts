import { BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, DataTypes, Model, Sequelize } from "sequelize"
import { Stream } from "./stream_entry"

export interface StreamStateAttributes {
    id: string,
    stream_id: string,
    status_code: number
    body: string
}

export class StreamState extends Model implements StreamStateAttributes {
    public id!: string
    public readonly createdAt!: Date
    public readonly updatedAt!: Date

    public stream_id!: string
    public status_code!: number
    public body!: string

    public createStream!: BelongsToCreateAssociationMixin<Stream>
    public getStream!: BelongsToGetAssociationMixin<Stream>
    public setStream!: BelongsToSetAssociationMixin<Stream, Stream['id']>

    public static initModel(sequelize: Sequelize): Model<StreamStateAttributes, {}> {
        return this.init({
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            stream_id: { type: DataTypes.UUID, allowNull: false },
            body: { type: DataTypes.STRING, allowNull: false },
            status_code: { type: DataTypes.SMALLINT, allowNull: false }
        }, {
            sequelize: sequelize,
            tableName: "stream_state"
        })
    }
}

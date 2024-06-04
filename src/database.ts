import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'

type DefaultColumns = Record<string, any>
type Columns<Fields> = Record<keyof Fields, any> | DefaultColumns

type Filter<Keys extends string, Fields> = Record<
    Fields extends DefaultColumns ? string : Keys | keyof Fields,
    Fields extends DefaultColumns ? any : Keys extends keyof Fields ? Fields[Keys] : never
>

type FilterCallback<Fields> = (row: Fields) => boolean

export default class CSVDatabase<Fields extends Columns<Fields> = DefaultColumns> {

    findOne<Keys extends string>(filter: Filter<Keys, Fields>): Promise<Fields | null>
    findOne(filter: FilterCallback<Fields>): Promise<Fields | null>

    async findOne(filter: Filter<string, DefaultColumns> | FilterCallback<DefaultColumns>): Promise<Fields | null> {
        // TODO
        return null
    }

}
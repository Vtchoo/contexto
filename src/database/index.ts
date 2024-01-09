import dataSource from '../../dataSource'

async function createConnection() {
    await dataSource.initialize()
    return dataSource
}

export default createConnection

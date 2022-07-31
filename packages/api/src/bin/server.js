import { APIServer } from "../"

async function main() {
    const IAPIServer = new APIServer()

    await IAPIServer.initialize()
}

main().catch((error) => {
    console.error(`🆘  Fatal error: ${error}`)
    process.exit(1)
})
import config from "../jest.config";
import jest from "jest";

const cliArgs = [...process.argv.slice(2), "--config", JSON.stringify(config)];

await jest.run(cliArgs);

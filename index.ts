declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import { program } from "commander";

import { CLIArguments, DigitalOceanCredentials } from "./interfaces/interfaces";
import {
  listDropletGenerator,
  createDropletGenerator,
  deleteDropletGenerator,
} from "./src/generator";

const { DIGITAL_OCEAN_ACCESS_TOKEN }: DigitalOceanCredentials = process.env;
const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;

async function run() {
  const dropletNameMessage = "Please provide a valid name";
  const dropletIdMessage = "Please provide a valid droplet ID";
  const createMessage = "Will create the droplet if it does not exist";
  const listMessage = "Will return droplet info if the droplet exists";
  const burnMessage = "Will delete the droplet after a minute";

  program
    .option("-n, --dropletName <type>", dropletNameMessage)
    .option("-i, --dropletId <type>", dropletIdMessage)
    .option("-c, --create", createMessage)
    .option("-l, --list", listMessage)
    .option("-b, --burn", burnMessage);

  program.parse(process.argv);
  const options: CLIArguments = program.opts();
  const { dropletName, dropletId, create, list, burn } = options;

  // Make sure setup is correct

  if (!apiToken) {
    const noApiTokenMsg = "API Token is missing in .env file";
    console.error({ status: 400, response: noApiTokenMsg });
    return undefined;
  }

  if (!dropletName && !dropletId) {
    const noIdentifierMsg = `Command is missing the name or ID of a droplet`;
    console.error({ status: 400, response: noIdentifierMsg });
    return;
  }

  // Get Droplet Contents...

  if ((dropletName || dropletId) && list) {
    const startMsg = `List Droplet Generator: ${dropletName || dropletId}`;
    console.log({ status: 100, response: startMsg });
    const numberId = dropletId ? Number(dropletId) : undefined;
    const res = await listDropletGenerator(dropletName, numberId);
    return res;
  }

  // Create a new Droplet...

  if (dropletName && create) {
    const startMsg = `Create Droplet Generator: ${dropletName}`;
    console.log({ status: 100, response: startMsg });
    const res = await createDropletGenerator(dropletName, create, burn);
    return res;
  }

  // Delete a Droplet...

  if ((dropletName || dropletId) && !create && burn) {
    const startMsg = `Delete Droplet Generator: ${dropletName}`;
    console.log({ status: 100, response: startMsg });
    const numberId = dropletId ? parseInt(dropletId) : undefined;
    const res = await deleteDropletGenerator(dropletName, numberId);
    return res;
  }
}

run();

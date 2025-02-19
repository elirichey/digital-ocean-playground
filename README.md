# Overview

CLI tool for working with Digital Ocean Droplets

<br>
<br>

## Arguments

### Droplet Requests:

##### _Note_

- Droplet Name or Droplet ID are required for all requests **_except_** SSL OR Listing Account Droplets!!!

<br>

**Get SSL Certs**

- Purpose: Get list of SSL certs tied to account
- Flag: `-ssl` or `--ssl`

**Droplet Name**

- Purpose: Name of the droplet
- Flag: `-n` or `--dropletName`

**Droplet ID**

- Purpose: Get info on an existing droplet
- Flag: `-i` or `--dropletId`

**Create**

- Purpose: Create the droplet if it does not exist
- Flag: `-c` or `--create`
- _Note:_ if there is a firewall in .env file, it will automatically add firewall rules to newly created Droplet

**List**

- Purpose: List the droplet data if it exists
- Flag: `-l` or `--list`
- _Note:_ can be used for a single droplet, or used to get all droplets on an account

**Burn / Delete**

- Purpose: Delete the droplet
- Flag:
  - `-b` or `--burn`
  - `-d` or `--delete`

**Firewall**

- Purpose: Add firewall to Droplet
- Flag: `-f` or `--firewall`

**Subdomain**

- Purpose: Add Subdomain to droplet and configure SSL
- Flag: `-s` or `--subdomain`

<br>
<br>

## Example

`npx tsx index.ts -n "my-new-droplet" -c`

<br>
<br>

# ENV Setup

```bash
DIGITAL_OCEAN_ACCESS_TOKEN=""
DIGITAL_OCEAN_SNAPSHOT_ID=""
DIGITAL_OCEAN_FIREWALL_ID=""
DIGITAL_OCEAN_DOMAIN=""
DIGITAL_OCEAN_SSH_KEYS=""  # seperate values with ',' ie: 1234,3214

SSL_USER=""
SSL_PRIVATE_KEY_PATH=""
SSL_PRIVATE_KEY_PASSWORD=""
```

# Overview

CLI tool for working with Digital Ocean Droplets

- Get all Droplets
- Get Droplet Overview
- Create Droplet
  - Create from Snapshot
  - Add Firewall
- Delete Droplet
- Add Firewall to Droplet

<br>
<br>

## Arguments

### _Note_

- Bucket Name or Bucket ID are required for all requests **_except_** Listing Account Buckets!!!

<br>

**Bucket Name**

- Purpose: Name of the droplet
- Flag: `-n` or `--bucketName`

**Bucket ID**

- Purpose: Get info on an existing bucket
- Flag: `-i` or `--bucketId`

**Create**

- Purpose: Create the bucket if it does not exist
- Flag: `-c` or `--create`
- Note: if there is a firewall in .env file, it will automatically add firewall rules to newly created Droplet

**List**

- Purpose: List the bucket data if it exists
- Flag: `-l` or `--list`

**Burn**

- Purpose: Shut off the Droplet after 1 minute
- Flag: `-b` or `--burn`

**Firewall**

- Purpose: Add firewall to Droplet
- Flag: `-f` or `--firewall`

<br>
<br>

## Example

`npx tsx index.ts -n "my-new-droplet" -c -b`

<br>
<br>

# ENV Setup

```bash
DIGITAL_OCEAN_ACCESS_TOKEN=""
SNAPSHOT_ID=""
FIREWALL_ID=""
```

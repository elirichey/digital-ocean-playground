# Overview

Spin Up Digital Ocean Droplet, then kill it after a specified amount of time.

<br>
<br>

## Arguments

### _Note_

- _Bucket Name or Bucket ID are required for all requests!!!_

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

**List**

- Purpose: List the bucket data if it exists
- Flag: `-l` or `--list`

**Burn**

- Purpose: Shut off the Droplet after 1 minute
- Flag: `-b` or `--burn`

<br>
<br>

## Example

`npx tsx index.ts -n "my-new-droplet" -c -b`

<br>
<br>

# ENV Setup

```bash
DIGITAL_OCEAN_ACCESS_TOKEN=""
```

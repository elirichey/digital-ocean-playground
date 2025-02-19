declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import { NodeSSH } from "node-ssh";
import { LogBody } from "../interfaces/interfaces";

const { SSL_SIGNING_EMAIL } = process.env;
const email = SSL_SIGNING_EMAIL;

interface SslNginxResponse {
  status: number; // 200 | 400
  response: string;
}

const logger = {
  log: (response: any) => console.log("ServerNginxSSL", { response }),
  error: (response: any) => console.error("ServerNginxSSL", { response }),
};

function logData(options: Partial<LogBody>) {
  const log: Partial<LogBody> = {};
  options.status ? (log.status = options.status) : null;
  options.response ? (log.response = options.response) : null;
  options.body ? (log.body = options.body) : null;
  log.dateTime = new Date().getTime();

  const hasStatusError =
    options.status && (options.status === 400 || options.status === 404);
  if (hasStatusError) logger.error(JSON.stringify(log));
  else logger.log(JSON.stringify(log));
}

async function generateSslCertificate(
  ssh: any,
  domain: string
): Promise<SslNginxResponse> {
  try {
    const startGeneratingSSLMsg = `Generating SSL certificate using Certbot for domain ${domain}...`;
    logData({ status: 100, response: startGeneratingSSLMsg });

    // Run Certbot to generate the SSL certificate
    const certbotCommand = `certbot --nginx -d ${domain} --agree-tos --non-interactive --email ${email}`;
    const certbotResult = await ssh.execCommand(certbotCommand);

    if (certbotResult.code !== 0) {
      const hasErrorMsg = `Certbot failed to generate SSL certificate for domain ${domain}`;
      const errorBody = certbotResult.stderr;
      const response = { status: 400, response: hasErrorMsg };
      logData({ ...response, body: errorBody });
      return response;
    }

    const successMsg = `SSL certificate generated successfully for ${domain}`;
    logData({ status: 200, response: successMsg });

    // Optionally, reload NGINX after SSL certificate generation
    await ssh.execCommand("systemctl reload nginx");

    const reloadedMsg = "NGINX reloaded with new SSL certificate.";
    const response = { status: 200, response: reloadedMsg };
    logData(response);
    return response;
  } catch (error) {
    const errorMsg = `Catch Error generating SSL certificate`;
    const response = { status: 400, response: errorMsg };
    logData({ ...response, body: error });
    return response;
  }
}

function generateNginxDefault(domain: string): string {
  return `server {
    # Redirect HTTP to HTTPS
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;

    index index.html index.htm index.nginx-debian.html;

    server_name ${domain};  # Replace with your domain

    # Try to serve static files, if not, proxy to the backend
    location / {
      try_files $uri $uri/ @proxy;
    }

    # Define a named location for proxying
    location @proxy {
      proxy_pass http://localhost:3000;
    }

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
  }

  server {
      # SSL Configuration for HTTPS
      listen 443 ssl;
      server_name ${domain};  # Replace with your domain

      ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;  # Path to your SSL certificate
      ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;  # Path to your SSL private key
      # ssl_protocols TLSv1.2 TLSv1.3;

      location / {
        proxy_pass http://localhost:3000;
      }
  }`;
}

function generateNginxConfig(domain: string): string {
  return `server {
    # Redirect HTTP to HTTPS
    listen 80;
    server_name ${domain};

    location / {
      proxy_pass http://localhost:3000;
    }

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
  }

  server {
      # SSL Configuration for HTTPS
      listen 443 ssl;
      server_name ${domain};

      location / {
        proxy_pass http://localhost:3000;
      }            
  }`;
}

export async function updateNginxConfig(
  domain: string,
  dropletIp: string,
  username: string,
  privateKey: string,
  passphrase: string
): Promise<SslNginxResponse> {
  const ssh: NodeSSH = new NodeSSH();

  try {
    await ssh.connect({
      host: dropletIp,
      username, //  "root", // Change this to your username if needed
      privateKey, // Path to the private key for SSH login
      passphrase,
    });

    const connectedMsg = `Connected to ${dropletIp}`;
    logData({ status: 100, response: connectedMsg });

    // Generate SSH Keys
    const ssl = await generateSslCertificate(ssh, domain);
    if (ssl.status !== 200) {
      const errorMsg = `Error generating SSH Keys`;
      const response = { status: 400, response: errorMsg };
      logData(response);
      return response;
    }

    // Define the NGINX configuration for the domain
    const nginxDefault = generateNginxDefault(domain);
    const defaultFilePath = `/etc/nginx/sites-available/default`;
    const newNginxDefaultCommand = `echo "${nginxDefault}" > ${defaultFilePath}`;
    const newNginxDefault = await ssh.execCommand(newNginxDefaultCommand);

    if (newNginxDefault.code !== 0) {
      const failedMsg = `Failed writing NGINX Default configuration to ${defaultFilePath}`;
      const res = { status: 400, response: failedMsg };
      logData(res);
      return res;
    }

    const nginxDefaultSuccessMsg = `NGINX Default configuration written to ${defaultFilePath}`;
    logData({ status: 101, response: nginxDefaultSuccessMsg });

    // Create the NGINX config file on the server
    const nginxConfig = generateNginxConfig(domain);
    const configFilePath = `/etc/nginx/sites-available/${domain}`;
    const newSitesAvailableCommand = `echo "${nginxConfig}" > ${configFilePath}`;
    const sitesAvailable = await ssh.execCommand(newSitesAvailableCommand);

    if (sitesAvailable.code !== 0) {
      const failedMsg = `Failed writing NGINX Sites Available configuration to ${configFilePath}`;
      const res = { status: 400, response: failedMsg };
      logData(res);
      return res;
    }

    const nginxFileSuccessMsg = `NGINX Sites Available configuration written to ${configFilePath}`;
    logData({ status: 101, response: nginxFileSuccessMsg });

    const symlinkPath = `/etc/nginx/sites-enabled/${domain}`;
    const newSitesEnabledCommand = `ln -s ${configFilePath} ${symlinkPath}`;
    const sitesEnabled = await ssh.execCommand(newSitesEnabledCommand);

    if (sitesEnabled.code !== 0) {
      const failedMsg = `Failed creating symlink for ${domain} in Sites Enabled`;
      const res = { status: 400, response: failedMsg };
      logData(res);
      return res;
    }

    const symLinkSuccessMsg = `Created symlink for ${domain} in Sites Enabled`;
    logData({ status: 101, response: symLinkSuccessMsg });

    // Test the NGINX configuration for syntax errors
    const testConfigResult = await ssh.execCommand("nginx -t");
    if (testConfigResult.code !== 0) {
      const errorMsg = `NGINX config test failed`;
      const errorBody = testConfigResult.stderr;
      const response = { status: 400, response: errorMsg };
      logData({ ...response, body: errorBody });
      return response;
    }
    const syntaxSuccessMsg = "NGINX configuration syntax is correct.";
    logData({ status: 101, response: syntaxSuccessMsg });

    // Reload NGINX to apply changes
    await ssh.execCommand("systemctl reload nginx");
    const reloadSuccessMsg = "NGINX reloaded successfully!";
    logData({ status: 200, response: reloadSuccessMsg });
  } catch (error) {
    const errorMsg = "Catch error updating NGINX config:";
    const response = { status: 400, response: errorMsg };
    logData({ ...response, body: error });
    return response;
  } finally {
    ssh.dispose();
    const closedMsg = `SSH Connection Shut Down`;
    const response = { status: 200, response: closedMsg };
    logData(response);
    return response;
  }
}

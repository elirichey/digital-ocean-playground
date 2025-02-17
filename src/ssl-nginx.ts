import { NodeSSH } from "node-ssh";

interface SslNginxResponse {
  status: number; // 200 | 400
  response: string;
}

async function generateSslCertificate(
  ssh: any,
  domain: string
): Promise<SslNginxResponse> {
  try {
    const startGeneratingSSLMsg = `Generating SSL certificate using Certbot for domain ${domain}...`;
    console.log({ status: 100, response: startGeneratingSSLMsg });

    const email = `email@email.com`;
    // Run Certbot to generate the SSL certificate
    const certbotCommand = `certbot --nginx -d ${domain} --agree-tos --non-interactive --email ${email}`;
    const certbotResult = await ssh.execCommand(certbotCommand);

    if (certbotResult.code !== 0) {
      const hasErrorMsg = `Certbot failed to generate SSL certificate for domain ${domain}`;
      const errorBody = certbotResult.stderr;
      const response = { status: 400, response: hasErrorMsg };
      console.error(response, errorBody);
      return response;
    }

    const successMsg = `SSL certificate generated successfully for ${domain}`;
    console.log({ status: 200, response: successMsg });

    // Optionally, reload NGINX after SSL certificate generation
    await ssh.execCommand("systemctl reload nginx");

    const reloadedMsg = "NGINX reloaded with new SSL certificate.";
    const response = { status: 200, response: reloadedMsg };
    console.log(response);
    return response;
  } catch (error) {
    const errorMsg = `Catch Error generating SSL certificate`;
    const response = { status: 400, response: errorMsg };
    console.log({ ...response, body: error });
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
    console.log({ status: 100, response: connectedMsg });

    // Generate SSH Keys
    const ssl = await generateSslCertificate(ssh, domain);
    if (ssl.status !== 200) {
      const errorMsg = `Error generating SSH Keys`;
      const response = { status: 400, response: errorMsg };
      console.error(response);
      return response;
    }

    // Define the NGINX configuration for the domain
    const nginxDefault = generateNginxDefault(domain);
    const defaultFilePath = `/etc/nginx/sites-available/default`;
    await ssh.execCommand(`echo "${nginxDefault}" > ${defaultFilePath}`);

    // Create the NGINX config file on the server
    const nginxConfig = generateNginxConfig(domain);
    const configFilePath = `/etc/nginx/sites-available/${domain}`;
    await ssh.execCommand(`echo "${nginxConfig}" > ${configFilePath}`);

    const symlinkPath = `/etc/nginx/sites-enabled/${domain}`;
    await ssh.execCommand(`ln -s ${configFilePath} ${symlinkPath}`);

    // Test the NGINX configuration for syntax errors
    const testConfigResult = await ssh.execCommand("nginx -t");
    if (testConfigResult.code !== 0) {
      const errorMsg = `NGINX config test failed`;
      const errorBody = testConfigResult.stderr;
      const response = { status: 400, response: errorMsg };
      console.error({ ...response, body: errorBody });
      return response;
    }
    const syntaxSuccessMsg = "NGINX configuration syntax is correct.";
    console.log({ status: 101, response: syntaxSuccessMsg });

    // Reload NGINX to apply changes
    await ssh.execCommand("systemctl reload nginx");
    const reloadSuccessMsg = "NGINX reloaded successfully!";
    console.log({ status: 200, response: reloadSuccessMsg });
  } catch (error) {
    const errorMsg = "Catch error updating NGINX config:";
    const response = { status: 400, response: errorMsg };
    console.error({ ...response, body: error });
    return response;
  } finally {
    ssh.dispose();
    const closedMsg = `SSH Connection Shut Down`;
    const response = { status: 200, response: closedMsg };
    console.log(response);
    return response;
  }
}

/*/
// Example usage
const domain = "domain.example.com"; // Your domain
const dropletIp = "your_droplet_ip"; // Replace with your droplet's IP address
const username = "root";
const privateKey = path.join(__dirname, "path_to_your_private_key"); // Path to your private key file

updateNginxConfig(domain, dropletIp, username, privateKey);
/*/

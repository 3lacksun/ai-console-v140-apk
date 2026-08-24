# Security

Do not open a public issue containing API keys, access tokens, private keys, Android production signing material, recovery secrets or other credentials.

When GitHub private vulnerability reporting is enabled for this repository, use the repository **Security → Report a vulnerability** flow for security-sensitive disclosures. Otherwise, contact the repository owner through a private channel already established for the project.

Production Android keystores and signing passwords must remain outside source control. The CI workflow expects production signing material through GitHub Secrets only.

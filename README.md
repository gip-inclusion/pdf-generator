# pdf-generator

This Express.js service generates PDFs from two sources:

- An arbitrary URL via the `/print` endpoint
- An HTML string provided in the request body via the `/generate` endpoint

## Installation on Scalingo

You can deploy your own PDF generator on Scalingo by forking this repository.

A GitHub action automatically deploys the application to Scalingo when you push to the `main` branch.

You will need to provide the following environment variables (in the GitHub repository settings):

Variables:
- `APP_NAME`: the name of the app on Scalingo
- `REGION`: the region of the app on Scalingo
- `TARGZ_URL`: the URL of the tar.gz archive of the app to deploy

Secret:
- `SCALINGO_API_TOKEN`: a token with the appropriate rights to deploy the app mentioned in the variables

## Configuration

- Create a Scalingo application linked to the repository
- As concurrency is not managed by this service, you should probably use S or M type containers. More information in the [nodejs-buildpack documentation](https://github.com/Scalingo/nodejs-buildpack#reasonable-defaults-for-concurrency)
- Set up the environment variables:
  - `API_KEY`: API key to secure the endpoints
  - `PORT`: port on which the server will listen

## Usage

### `/print` Endpoint

Generates a PDF from a URL. The complete URL must be provided in the `url` parameter.

Query parameters:
- `url`: the complete URL of the page to convert to PDF (required, must be URL-encoded)
- `name`: the name of the downloaded PDF file (required)
- `marginTop`: top margin (default: "1cm")
- `marginRight`: right margin (default: "1cm")
- `marginBottom`: bottom margin (default: "1cm")
- `marginLeft`: left margin (default: "1cm")

Example:
```
https://<thisservicehostname>/print?url=https%3A%2F%2Fexample.com%2Fpage&name=document.pdf&marginTop=2cm&marginRight=1.5cm
```

Note: The URL must be properly URL-encoded. In the example above, `https://example.com/page` is encoded as `https%3A%2F%2Fexample.com%2Fpage`.

### `/generate` Endpoint

Generates a PDF from an HTML string.

Request body (JSON):
```json
{
  "htmlContent": "<html>...</html>",
  "marginTop": "2cm",
  "marginRight": "1.5cm",
  "marginBottom": "2cm",
  "marginLeft": "1.5cm"
}
```

Query parameters:
- `request_id`: request identifier (optional, automatically generated if not provided)

Default margins for this endpoint:
- `marginTop`: "2.5cm"
- `marginRight`: "1.5cm"
- `marginBottom`: "2.5cm"
- `marginLeft`: "1.5cm"

### `/ping` Endpoint

Used as a heartbeat for the service. Returns the string "ok" with a 200 status code.

## Security

All endpoints are protected by an API key that must be provided in the `Authorization` header of each request.

## Future improvements

- The generated PDF should probably be cached

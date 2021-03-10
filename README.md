# Webhook Publisher
Publishes Webhook events behind the scenes, freeing your frontend.

This microservice handles publishing webhook events to numerous clients without slowing down the event emitter. A fire and forget solution that requires minimal setup and no external "subscription" is required for your API consumers, you simply tell it what endpoints to hit.

[Example Video (mp4)](https://i.lu.je/2021/IOxRsiMx01.mp4)

This is particularlly useful if you have a web service written in a language like PHP, and you wish to execute your API consumer's webhooks on a user action. You dont want to wait around for your slow consumer servers before responding to the user. 

# Terminology

* `Publisher` is your web service that is emitting the events
* `Hook` is the consumer of your service's webhook feature. They are the individual webhooks
* `Publication`, `Event` these mean the same thing. They are the event you send.
* `WHPUB`, `Service` this application

# Usage

## Signatures
The usage is fairly straight forward, but for security purposes its important you setup 2 seperate RSA keys before hand:

1. Your Publisher (private) -> WHPUB (public) 
2. The WHPUB (private) -> Hook (public)

Ensure you have the appropriate WHPUB keys configured in the .env. These are used to verify signatures and then later on, generate signatures.

## Running

Running is straight forward:

`node src/index.mjs`

## Configuration

The configuration is likely to change as this project gets developed. Initially, there can only be one Publisher, but that is a lack of configuration infrastructure.

In the meantime, all the configuration is managed by the .env
| Key | Description |
|-----|-------------|
| PORT | Port of the WHPUB Service (If using the WebService). | 
|PUBLISHER_NAME| The name of the first default publisher. Used for authorization. |
|PUBLISHER_KEY| A path to the publisher's public key. Used to verify publications from the publisher. |
|PRIVATE_KEY|A path to the WHPUB private key. Used to generate signatures. |
|USER_AGENT|An optional parameter to customise the user agent that is sent in hooks. Useful for "professionalism". |

## Publishing Events

Publishing a event is straight forward. Simple use `POST /publish` to post the event payload:
```json
{
    "hooks": [
        <webhook-urls>
    ],
    "event": "name.of.event",
    "author": "author-identitifcation",
    "payload": {
      <some-payload-structure>
    }
}
```

To authorize yourself to do this, include the following 2 headers:
| Header | Description |
|--------|-------------|
| `X-Credential` | The name of the credential. As defined by the PUBLISHER_NAME |
| `X-Signature` | A SHA256 signature of the entire JSON payload, using the private key pair of the PUBLISHER_KEY. It needs to be compatible with `crypto.verify`|

You will receive a HTTP 200 (OK) if successful, with a simple payload that looks like this:
```json
{
  "id": "a time sortable id"
}
```

You can supply the `id` field to the `/publish` payload too if you wish to manually define the IDs. This will be required in the future for some other services such as the RedisPubSubService.

## Receiving Webhooks

Hello! You may have been linked here because your developer didn't want to rewrite this o/
The webhooks are all sent out with the following headers:
| Header | Description |
|--------|-------------|
| `X-Hook-ID` | Unique identifier of the webhook. This in theory should be time sortable and the publisher should have a endpoint to retrieve events after this id. |
| `X-Hook-Time` | Unix Epoch Timestamp ( in ms) that the publication was made. This maybe different than time received as publications can be queued for long periods. |
| `X-Hook-Author` | Copy of the `author` field in the payload. It's the user that trigged the webhook. |
| `X-Hook-Event` | Copy of the `event` field in the payload. It's the event that triggered the webhook. |
| `X-Hook-Signature` | A SHA356 Signature of the entire body. Ensure this is valid with the public key pair of the PRIVATE_KEY. Ask your API host to provide the public key. |

The payload looks like so:
```json
{
  "id": "60489484065f8584a4c2b076000025",
  "event": "name.of.event",
  "author": "unique-identifier",
  "payload": {
    <event-payload>
  }
}
```

### Security
It's important that, as a consumer of the webhook, you verify that the signature has come from this service. Use the Public Key and verify the `X-Hook-Signature` of the body before continue processing webhooks.

The verify function must be equivilent of [Node.JS crypto.Sign](https://nodejs.org/api/crypto.html#crypto_class_sign). It uses a `SHA256` algorithm. 

# Docker
_coming soon_

If you are able to help with the docker, i will be accepting any PRs to get it setup.

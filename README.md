# whoami.home-assistant.io

API running as a [worker](https://workers.cloudflare.com/) in [Cloudflare's](https://www.cloudflare.com/) network.

## Adress structure

`[schema]://whoami.home-assistant.io/v1/[key]`

| placeholder | required | description                                                 |
| ----------- | -------- | ----------------------------------------------------------- |
| `schema`    | True     | Use `http` or `https`                                       |
| `key`       | False    | Return a single key from the regular JSON response as text. |

## Examples

```bash
curl -sSL https://whoami.home-assistant.io/v1
{
  "ip": "1.2.3.4",
  "city": "Gotham",
  "continent": "Earth",
  "country": "XX",
  "latitude": "12.34567",
  "longitude": "12.34567",
  "postal_code": "12345",
  "region_code": "00",
  "region": "Costa Gravas",
  "timezone": "Earth/Gotham",
  "iso_time": "2021-05-12T11:29:15.752Z",
  "timestamp": 1620818955752
}
```

```bash
curl -sSL https://whoami.home-assistant.io/v1/ip
1.2.3.4
```

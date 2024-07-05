# services.home-assistant.io

Home Assistant web services running on CloudFlare [workers](https://workers.cloudflare.com/)

## whoami

IP Based GEO lookup

### Adress structure

`[schema]://services.home-assistant.io/whoami/v1/[key]`

| placeholder | required | description                                                 |
| ----------- | -------- | ----------------------------------------------------------- |
| `schema`    | True     | Use `http` or `https`                                       |
| `key`       | False    | Return a single key from the regular JSON response as text. |

### Examples

```bash
curl -sSL https://services.home-assistant.io/whoami/v1
{
  "ip": "1.2.3.4",
  "city": "Gotham",
  "continent": "Earth",
  "country": "XX",
  "currency": "XXX",
  "latitude": "12.34567",
  "longitude": "12.34567",
  "postal_code": "12345",
  "region_code": "00",
  "region": "Gotham",
  "timezone": "Earth/Gotham",
  "iso_time": "2021-05-12T11:29:15.752Z",
  "timestamp": 1620818956
}
```

```bash
curl -sSL https://services.home-assistant.io/whoami/v1/ip
1.2.3.4
```

## assist

Services used for assist.

### Upload wake word training data

```bash
curl --location --request PUT 'https://services.home-assistant.io/assist/wake_word/training_data/upload?wake_word=[name]&user_content=[user content]' \
--header 'Content-Type: audio/webm' \
--data '@/data/file.webm'
```

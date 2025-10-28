export function handler(req, res) {
  res.json({ "message" : "hello! this is test" })
}

export const config = {
  httpMethod: 'POST',
  middleware: []
}
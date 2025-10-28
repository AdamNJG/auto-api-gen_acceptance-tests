import express from 'express';
import api from '././api.js';

const app = express();

app.use('/', api);

app.listen(4000, () => {
  console.log('Example app listening on port 4000'); 
}); 
  
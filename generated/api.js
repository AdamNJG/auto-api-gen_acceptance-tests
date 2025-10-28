import express from 'express';
import {handler as api_index_js} from '../api/index.js'
import {handler as api_test_js} from '../api/test.js'

const router = express.Router();

router.get('/', api_index_js);
router.post('/test', api_test_js);

export default router;
    
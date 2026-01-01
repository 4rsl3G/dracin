'use strict';

const express = require('express');
const controller = require('../controllers/netshort.controller');

const router = express.Router();

router.get('/', controller.home);
router.get('/browse', controller.browse);
router.get('/detail/:shortPlayId', controller.detail);
router.get('/watch/:shortPlayId/:episodeId', controller.player);

router.get('/api/foryou', controller.apiForYou);
router.get('/api/search', controller.apiSearch);

module.exports = router;

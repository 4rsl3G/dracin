const express = require('express');
const router = express.Router();
const controller = require('../controllers/mainController');

router.get('/', controller.home);
router.get('/home', controller.home);
router.get('/show/:code', controller.showDetail);
router.get('/play/:code', controller.player);

// Language setter helper (AJAX usage)
router.get('/set-lang/:lang', (req, res) => {
    res.cookie('lang', req.params.lang, { maxAge: 90000000 });
    res.json({ success: true });
});

module.exports = router;

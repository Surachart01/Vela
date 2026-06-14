const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');

router.get('/', countryController.listCountries);
router.post('/', countryController.addCountry);
router.put('/:id', countryController.updateCountry);
router.delete('/:id', countryController.deleteCountry);

module.exports = router;

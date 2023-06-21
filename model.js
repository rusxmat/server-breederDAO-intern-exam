const mongoose = require('mongoose');
const { Schema } = mongoose;
const {AXIE_CLASS} = require('./utilities')

const axieSchema = new Schema({
  _id: Number,
  name: String,
  stage: Number, 
  class: String,
  currentPrice: Number,
});

const AxieClass = new Map()
AXIE_CLASS.forEach( (TYPE, i) => {
    AxieClass.set(TYPE,  mongoose.model(TYPE.concat('_class'), axieSchema)) 
})

module.exports = {
    AxieClass
};
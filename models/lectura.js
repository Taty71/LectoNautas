const mongoose = require('mongoose');

const lecturaSchema = new mongoose.Schema({
    estudiante: { type: String, required: true },
    escuela: String,
    grado: String,
    division: String,
    turno: String,
    ppm: { type: Number, required: true }, // Palabras Por Minuto
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lectura', lecturaSchema);

const express = require('express');
const router = express.Router();
const Lectura = require('../models/lectura.js');

router.post('/evaluar', async (req, res) => {
    try {
        const { ppm, estudiante, escuela, grado, division, turno } = req.body;

        // 1. Guardar en MongoDB
        const nuevaLectura = new Lectura({ estudiante, escuela, grado, division, turno, ppm });
        await nuevaLectura.save();

        // 2. Determinar lógica de feedback
        let feedback = {};
        if (ppm > 90) {
            feedback = { color: 'verde', emoticon: '<img src="./recursos/cinco-estrellas.png" alt="5 estrellas" class="emoji-img">', mensaje: '¡Lectura fluida e increíble!' };
        } else if (ppm >= 50) {
            feedback = { color: 'amarillo', emoticon: '<img src="./recursos/como.png" alt="Pulgar arriba" class="emoji-img">', mensaje: 'Vas por buen camino, ¡sigue practicando!' };
        } else {
            feedback = { color: 'rojo', emoticon: '<img src="./recursos/musculo.png" alt="Músculo" class="emoji-img">', mensaje: '¡No te rindas! Mañana lo harás mejor.' };
        }

        // 3. Responder al frontend
        res.json({ success: true, ...feedback });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al procesar la lectura' });
    }
});

module.exports = router;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('lecturaForm');
    const resultadoCard = document.getElementById('resultado');
    const emojiGigante = document.getElementById('emoji-gigante');
    const mensajeResultado = document.getElementById('mensaje-resultado');
    const btnNuevo = document.getElementById('btn-nuevo');

    // UI del micrófono
    const btnIniciar = document.getElementById('btn-iniciar-mic');
    const btnDetener = document.getElementById('btn-detener-mic');
    const btnProcesando = document.getElementById('btn-procesando');
    const temporizadorEl = document.getElementById('temporizador');
    const palabrasContadasEl = document.getElementById('palabrasContadas');
    const textoEscuchadoEl = document.getElementById('texto-escuchado');
    const micStatusEl = document.getElementById('mic-status');
    const ppmInput = document.getElementById('ppm');
    const micContainer = document.querySelector('.mic-container');

    let recognition;
    let timerInterval;
    let tiempoRestante = 60; // 60 segundos
    let leyendo = false;
    let finalTranscript = '';

    // Inicializar Soporte de Micrófono
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-AR'; // O es-ES, es-MX
    } else {
        micStatusEl.textContent = "Tu navegador no soporta lectura por voz (Intenta usar Chrome 🚀).";
        btnIniciar.disabled = true;
    }

    // --- EVENTOS DEL MICRÓFONO ---
    if (recognition) {
        recognition.onstart = () => {
            leyendo = true;
            micStatusEl.textContent = "¡Escuchando atentamente! 👂";
            micContainer.classList.add('grabando');
            iniciarTemporizador();
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptFragment = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcriptFragment + ' ';
                } else {
                    interimTranscript += transcriptFragment;
                }
            }
            
            const textoCompleto = finalTranscript + interimTranscript;
            textoEscuchadoEl.textContent = textoCompleto || "...";
            
            // Contar palabras
            const palabras = textoCompleto.trim().split(/\s+/).filter(word => word.length > 0);
            palabrasContadasEl.textContent = palabras.length;
            ppmInput.value = palabras.length; // Guardamos el valor actual por si acaso
            
            // Desplazar caja de texto hacia abajo
            textoEscuchadoEl.parentElement.scrollTop = textoEscuchadoEl.parentElement.scrollHeight;
        };

        recognition.onerror = (event) => {
            console.error(event.error);
            if(event.error === 'not-allowed') {
                micStatusEl.textContent = "¡Necesito permiso para usar el micrófono!";
                detenerLectura(false); // Detenemos sin procesar
            }
        };

        recognition.onend = () => {
            // Si el timer llega a cero, recognition.stop() activa este evento
            if (leyendo) {
                // A veces se corta solo por silencio prolongado, lo reiniciamos si aún hay tiempo
                if(tiempoRestante > 0) {
                    recognition.start();
                } else {
                    detenerLectura(true);
                }
            }
        };
    }

    // Iniciar Misión
    btnIniciar.addEventListener('click', () => {
        const estudiante = document.getElementById('estudiante').value;
        if (!estudiante) {
            alert('¡Oye Lectonauta! Necesitamos saber tu nombre para encender la nave.');
            return;
        }

        // Reset estado local
        finalTranscript = '';
        textoEscuchadoEl.textContent = '...';
        palabrasContadasEl.textContent = '0';
        tiempoRestante = 60;
        actualizarReloj();
        
        btnIniciar.classList.add('oculto');
        btnDetener.classList.remove('oculto');
        
        try {
            recognition.start();
        } catch(e) {
            console.log("El reco ya estaba iniciado");
        }
    });

    // Detener antes de tiempo
    btnDetener.addEventListener('click', () => {
        detenerLectura(true);
    });

    // Lógica del Temporizador
    function iniciarTemporizador() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            tiempoRestante--;
            actualizarReloj();

            if (tiempoRestante <= 0) {
                clearInterval(timerInterval);
                detenerLectura(true);
            }
        }, 1000);
    }

    function actualizarReloj() {
        let segs = tiempoRestante;
        temporizadorEl.textContent = `00:${segs < 10 ? '0' + segs : segs}`;
    }

    function detenerLectura(debeProcesar) {
        leyendo = false;
        clearInterval(timerInterval);
        micContainer.classList.remove('grabando');
        
        try {
            recognition.stop();
        } catch(e){}

        btnDetener.classList.add('oculto');
        
        if(debeProcesar) {
            btnProcesando.classList.remove('oculto');
            micStatusEl.textContent = "¡Tiempo terminado! Calculando estrellas...";
            
            // Enviamos los datos automáticamente
            setTimeout(() => {
                enviarDatos();
            }, 1000); // Pequeña pausa para fluidez de UI
        } else {
            btnIniciar.classList.remove('oculto');
            micStatusEl.textContent = "Misión abortada por falta de permisos.";
        }
    }


    // --- COMUNICACIÓN CON NODE.JS ---
    async function enviarDatos() {
        // Asegurar conteo final oficial
        const textoCompleto = textoEscuchadoEl.textContent;
        const palabras = textoCompleto.trim().split(/\s+/).filter(word => word.length > 0);
        const ppmCalculadas = palabras.length;

        const data = {
            estudiante: document.getElementById('estudiante').value,
            escuela: document.getElementById('escuela').value,
            grado: document.getElementById('grado').value,
            division: document.getElementById('division').value,
            turno: document.getElementById('turno').value,
            ppm: ppmCalculadas
        };

        try {
            const response = await fetch('/api/lecturas/evaluar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                mostrarResultado(result);
            } else {
                alert('¡Oops! Algo salió mal procesando tus datos espaciales.');
                reiniciarUI();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('¡Oops! Error de conexión con la base espacial.');
            reiniciarUI();
        }
    }

    function mostrarResultado(result) {
        form.style.display = 'none';
        resultadoCard.classList.remove('oculto');
        
        // Apagar todas las luces primero
        document.getElementById('luz-rojo').classList.remove('active-rojo');
        document.getElementById('luz-amarillo').classList.remove('active-amarillo');
        document.getElementById('luz-verde').classList.remove('active-verde');
        
        // Encender la luz correspondiente
        if (result.color === 'rojo') {
            document.getElementById('luz-rojo').classList.add('active-rojo');
        } else if (result.color === 'amarillo') {
            document.getElementById('luz-amarillo').classList.add('active-amarillo');
        } else if (result.color === 'verde') {
            document.getElementById('luz-verde').classList.add('active-verde');
        }
        
        emojiGigante.textContent = result.emoticon;
        mensajeResultado.textContent = result.mensaje;

        if (result.color === 'verde') triggerConfetti();
        reiniciarUI(); // Preparamos controles por detrás
    }

    function reiniciarUI() {
        btnProcesando.classList.add('oculto');
        btnIniciar.classList.remove('oculto');
        temporizadorEl.textContent = "01:00";
        micStatusEl.textContent = "Presiona iniciar y comienza a leer";
    }

    btnNuevo.addEventListener('click', () => {
        form.reset();
        form.style.display = 'block';
        resultadoCard.classList.add('oculto');
        finalTranscript = '';
        textoEscuchadoEl.textContent = '...';
        palabrasContadasEl.textContent = '0';
    });

    // Efecto visual divertido
    function triggerConfetti() {
        var duration = 3 * 1000;
        var end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#2ECC71', '#F1C40F', '#3498DB']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#2ECC71', '#F1C40F', '#3498DB']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }
});

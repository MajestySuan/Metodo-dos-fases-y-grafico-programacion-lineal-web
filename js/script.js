google.charts.load('current', { 'packages': ['corechart'] });
google.charts.setOnLoadCallback(dibujarGraficoInicial);

function dibujarGraficoInicial() {
    const data = google.visualization.arrayToDataTable([
        ['x₁', 'x₂'],
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10]
    ]);

    const options = {
        title: 'Área de Solución Factible',
        hAxis: { title: 'x₁', minValue: 0 },
        vAxis: { title: 'x₂', minValue: 0 },
        legend: 'none',
        pointSize: 5,
        series: { 0: { lineWidth: 2 } }
    };

    const chart = new google.visualization.LineChart(document.getElementById('chart_div'));
    chart.draw(data, options);
}

function parseFraction(input) {
    if (typeof input === 'number') return input;
    if (input.includes('/')) {
        const parts = input.split('/').map(part => part.trim());
        if (parts.length !== 2) return NaN;
        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);
        if (isNaN(numerator) || isNaN(denominator) || denominator === 0) return NaN;
        return numerator / denominator;
    }
    return parseFloat(input) || 0;
}

function validarEntrada(input) {
    return /^-?\d*\.?\d*\s*\/?\s*-?\d*\.?\d*$/.test(input);
}

function intersecarRectas(r1, r2) {
    const a1 = r1.x1, b1 = r1.x2, c1 = r1.valor;
    const a2 = r2.x1, b2 = r2.x2, c2 = r2.valor;
    const det = a1 * b2 - a2 * b1;
    if (det === 0) return null;
    const x = (c1 * b2 - c2 * b1) / det;
    const y = (a1 * c2 - a2 * c1) / det;
    return { x, y };
}

function cumpleRestricciones(p, restricciones) {
    return restricciones.every(r => {
        const izq = r.x1 * p.x + r.x2 * p.y;
        switch (r.operador) {
            case '<=': return izq <= r.valor + 1e-6;
            case '>=': return izq >= r.valor - 1e-6;
            case '=': return Math.abs(izq - r.valor) < 1e-6;
            default: return false;
        }
    });
}

function obtenerPuntosFactibles(restricciones) {
    const puntosFactibles = [];
    
    // 1. Intersecciones entre restricciones
    for (let i = 0; i < restricciones.length; i++) {
        for (let j = i + 1; j < restricciones.length; j++) {
            const p = intersecarRectas(restricciones[i], restricciones[j]);
            if (p && isFinite(p.x) && isFinite(p.y) && p.x >= 0 && p.y >= 0 && cumpleRestricciones(p, restricciones)) {
                puntosFactibles.push(p);
            }
        }
    }
    
    // 2. Intersecciones con los ejes
    restricciones.forEach(r => {
        const { x1, x2, valor } = r;
        
        // Intersección con el eje x (y=0)
        if (x1 !== 0) {
            const x = valor / x1;
            const punto = { x, y: 0 };
            if (x >= 0 && cumpleRestricciones(punto, restricciones)) {
                puntosFactibles.push(punto);
            }
        }
        
        // Intersección con el eje y (x=0)
        if (x2 !== 0) {
            const y = valor / x2;
            const punto = { x: 0, y };
            if (y >= 0 && cumpleRestricciones(punto, restricciones)) {
                puntosFactibles.push(punto);
            }
        }
    });
    
    // 3. Origen (0,0)
    const origen = { x: 0, y: 0 };
    if (cumpleRestricciones(origen, restricciones)) {
        puntosFactibles.push(origen);
    }
    
    // Eliminar duplicados
    const puntosUnicos = [];
    const puntosVistos = new Set();
    
    puntosFactibles.forEach(p => {
        const clave = `${p.x.toFixed(4)}_${p.y.toFixed(4)}`;
        if (!puntosVistos.has(clave)) {
            puntosVistos.add(clave);
            puntosUnicos.push(p);
        }
    });
    
    return puntosUnicos;
}

function actualizarGrafico(restricciones) {
    const lineData = new google.visualization.DataTable();
    lineData.addColumn('number', 'x₁');
    lineData.addColumn('number', 'x₂');

    const puntosFactibles = obtenerPuntosFactibles(restricciones);

    restricciones.forEach(r => {
        const { x1, x2, valor } = r;
        if (x1 === 0 && x2 === 0) return;
        let punto1 = null, punto2 = null;

        const maxX = Math.max(...puntosFactibles.map(p => p.x), 10) * 1.2;
        const maxY = Math.max(...puntosFactibles.map(p => p.y), 10) * 1.2;

        if (x1 !== 0 && x2 !== 0) {
            punto1 = [0, valor / x2];
            punto2 = [maxX, (valor - x1 * maxX) / x2];
        } else if (x1 !== 0 && x2 === 0) {
            const x = valor / x1;
            if (isFinite(x)) {
                punto1 = [x, 0];
                punto2 = [x, maxY];
            }
        } else if (x1 === 0 && x2 !== 0) {
            const y = valor / x2;
            if (isFinite(y)) {
                punto1 = [0, y];
                punto2 = [maxX, y];
            }
        }

        if (punto1 && punto2) {
            lineData.addRow(punto1);
            lineData.addRow(punto2);
            lineData.addRow([null, null]);
        }
    });

    const options = {
        title: 'Área de Solución Factible',
        hAxis: { 
            title: 'x₁', 
            minValue: 0, 
            maxValue: Math.max(...puntosFactibles.map(p => p.x), 10) * 1.2 
        },
        vAxis: { 
            title: 'x₂', 
            minValue: 0, 
            maxValue: Math.max(...puntosFactibles.map(p => p.y), 10) * 1.2 
        },
        legend: 'none',
        pointSize: 6,
        tooltip: { isHtml: true },
        series: {
            0: { type: 'line', color: '#3366CC', lineWidth: 2 },
            1: { type: 'area', color: '#b2fab4', enableInteractivity: false },
            2: { type: 'scatter', color: 'green', pointShape: 'circle' }
        }
    };

    const combinedData = new google.visualization.DataTable();
    combinedData.addColumn('number', 'x₁');
    combinedData.addColumn('number', 'x₂ líneas');
    combinedData.addColumn('number', 'x₂ área');
    combinedData.addColumn('number', 'x₂ puntos');
    combinedData.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

    const rows = [];
    for (let i = 0; i < lineData.getNumberOfRows(); i++) {
        rows.push([
            lineData.getValue(i, 0),
            lineData.getValue(i, 1),
            null,
            null,
            null
        ]);
    }

    puntosFactibles.forEach(p => {
        const tooltip = `<div style='padding:4px'><strong>x₁:</strong> ${p.x.toFixed(2)}<br><strong>x₂:</strong> ${p.y.toFixed(2)}</div>`;
        rows.push([p.x, null, null, p.y, tooltip]);
    });

    if (puntosFactibles.length >= 3) {
        const cx = puntosFactibles.reduce((sum, p) => sum + p.x, 0) / puntosFactibles.length;
        const cy = puntosFactibles.reduce((sum, p) => sum + p.y, 0) / puntosFactibles.length;
        const ordenados = [...puntosFactibles].sort((a, b) =>
            Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
        );
        ordenados.forEach(p => {
            rows.push([p.x, null, p.y, null, null]);
        });
        const first = ordenados[0];
        rows.push([first.x, null, first.y, null, null]);
    }

    rows.forEach(row => combinedData.addRow(row));

    const chart = new google.visualization.ComboChart(document.getElementById('chart_div'));
    chart.draw(combinedData, options);
}

function mostrarSolucion(objetivo, restricciones, solucion) {
    const solucionInfo = document.getElementById('solucion-info');

    let html = `<h3>Solución del Problema</h3>
               <p><strong>Función Objetivo:</strong> ${objetivo.tipo === 'max' ? 'Maximizar' : 'Minimizar'} Z = ${objetivo.coefX1}x₁ + ${objetivo.coefX2}x₂</p>
               <p><strong>Restricciones:</strong></p>`;

    restricciones.forEach(r => {
        const { x1, x2, valor } = r;
        const a = parseFloat(x1);
        const b = parseFloat(x2);
        const c = parseFloat(valor);

        let texto = '';
        if (a !== 0) texto += `${a}x₁`;
        if (a !== 0 && b !== 0) texto += ' + ';
        if (b !== 0) texto += `${b}x₂`;
        if (texto === '') texto = '0';
        texto += ` ${r.operador} ${c}`;

        let punto = 'No válido';
        let explicacion = '';

        if (a !== 0 && b !== 0) {
            const x = c / a;
            const y = c / b;
            punto = `(${x.toFixed(2)}, ${y.toFixed(2)})`;
            explicacion = `
                <div><strong>✏️ Cálculo:</strong></div>
                x₁ = ${c} / ${a} = ${x.toFixed(2)}<br>
                x₂ = ${c} / ${b} = ${y.toFixed(2)}
            `;
        } else if (a !== 0 && b === 0) {
            const x = c / a;
            punto = `(${x.toFixed(2)}, 0)`;
            explicacion = `
                <div><strong>✏️ Cálculo:</strong></div>
                x₂ = 0<br>
                x₁ = ${c} / ${a} = ${x.toFixed(2)}
            `;
        } else if (a === 0 && b !== 0) {
            const y = c / b;
            punto = `(0, ${y.toFixed(2)})`;
            explicacion = `
                <div><strong>✏️ Cálculo:</strong></div>
                x₁ = 0<br>
                x₂ = ${c} / ${b} = ${y.toFixed(2)}
            `;
        }

        html += `
            <div class="caja-restriccion">
                <strong>${texto}</strong><br>
                Punto: ${punto}<br>
                ${explicacion}
            </div>
        `;
    });

    if (solucion) {
        html += `<div class="solucion-optima">
                    <h4>Solución Óptima:</h4>
                    <p>Z = ${solucion.valor}</p>
                    <p>x₁ = ${solucion.x1}</p>
                    <p>x₂ = ${solucion.x2}</p>
                </div>`;
    } else {
        html += `<p>Ingrese los datos y haga clic en "Resolver" para encontrar la solución.</p>`;
    }

    solucionInfo.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function () {
    const listaRestricciones = document.getElementById('lista-restricciones');
    const btnAnadir = document.getElementById('btn-anadir');
    const btnResolver = document.getElementById('btn-resolver');

    mostrarSolucion({ tipo: 'max', coefX1: 0, coefX2: 0 }, [], null);

    function agregarRestriccion() {
        const nuevaRestriccion = document.createElement('div');
        nuevaRestriccion.className = 'restriccion';
        nuevaRestriccion.innerHTML = `
            <div class="restriccion-campos">
                <div class="input-coeficiente">
                    <input type="text" placeholder="0" class="coef-input" value="0">
                    <span class="variable">x₁</span>
                </div>
                <span class="operador">+</span>
                <div class="input-coeficiente">
                    <input type="text" placeholder="0" class="coef-input" value="0">
                    <span class="variable">x₂</span>
                </div>
                <select class="operador-restriccion">
                    <option value="<=">≤</option>
                    <option value="=">=</option>
                    <option value=">=">≥</option>
                </select>
                <input type="text" placeholder="0" class="valor-restriccion" value="0">
            </div>
            <button class="btn-eliminar">×</button>
        `;

        listaRestricciones.appendChild(nuevaRestriccion);

        nuevaRestriccion.querySelector('.btn-eliminar').addEventListener('click', function () {
            if (listaRestricciones.children.length > 1) {
                nuevaRestriccion.remove();
                obtenerRestricciones();
            } else {
                alert("Debe haber al menos una restricción");
            }
        });

        nuevaRestriccion.querySelectorAll('input[type="text"]').forEach(input => {
            input.addEventListener('input', function (e) {
                if (!validarEntrada(e.target.value)) {
                    e.target.value = e.target.value.slice(0, -1);
                }
            });
        });

        nuevaRestriccion.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', obtenerRestricciones);
        });
    }

    function obtenerRestricciones() {
        const restricciones = [];
        const restriccionElements = document.querySelectorAll('.restriccion');

        restriccionElements.forEach(el => {
            const inputs = el.querySelectorAll('.coef-input');
            const operador = el.querySelector('.operador-restriccion').value;
            const valor = parseFraction(el.querySelector('.valor-restriccion').value);

            const coefX1 = parseFraction(inputs[0].value);
            const coefX2 = parseFraction(inputs[1].value);

            restricciones.push({
                x1: coefX1,
                x2: coefX2,
                operador: operador,
                valor: valor
            });
        });

        return restricciones;
    }

    btnAnadir.addEventListener('click', agregarRestriccion);

    btnResolver.addEventListener('click', function () {
        const tipoObjetivo = document.getElementById('tipo-objetivo').value;

        const coefInputs = document.querySelectorAll('.funcion-z .coef-input');
        const coefX1 = parseFraction(coefInputs[0].value);
        const coefX2 = parseFraction(coefInputs[1].value);

        const restricciones = obtenerRestricciones();

        if (isNaN(coefX1) || isNaN(coefX2)) {
            alert("Por favor ingrese valores válidos para la función objetivo");
            return;
        }

        // Obtener todos los puntos factibles
        const puntosFactibles = obtenerPuntosFactibles(restricciones);
        
        // Evaluar cada punto en la función objetivo
        const puntosEvaluados = puntosFactibles.map(p => {
            const valorZ = coefX1 * p.x + coefX2 * p.y;
            return { ...p, valorZ };
        });

        // Encontrar la solución óptima
        let solucionOptima = null;
        if (puntosEvaluados.length > 0) {
            if (tipoObjetivo === 'max') {
                solucionOptima = puntosEvaluados.reduce((max, p) => 
                    p.valorZ > max.valorZ ? p : max
                );
            } else {
                solucionOptima = puntosEvaluados.reduce((min, p) => 
                    p.valorZ < min.valorZ ? p : min
                );
            }
        }

        // Formatear la solución para mostrarla
        const solucion = solucionOptima ? {
            valor: solucionOptima.valorZ.toFixed(2),
            x1: solucionOptima.x.toFixed(2),
            x2: solucionOptima.y.toFixed(2)
        } : null;

        mostrarSolucion(
            { tipo: tipoObjetivo, coefX1, coefX2 },
            restricciones,
            solucion
        );

        actualizarGrafico(restricciones);
    });

    const primeraRestriccion = listaRestricciones.querySelector('.restriccion');
    if (primeraRestriccion) {
        primeraRestriccion.querySelector('.btn-eliminar').addEventListener('click', function () {
            if (listaRestricciones.children.length > 1) {
                primeraRestriccion.remove();
                obtenerRestricciones();
            } else {
                alert("Debe haber al menos una restricción");
            }
        });

        primeraRestriccion.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', obtenerRestricciones);
        });
    }

    document.querySelectorAll('.funcion-z .coef-input').forEach(input => {
        input.addEventListener('input', function (e) {
            if (!validarEntrada(e.target.value)) {
                e.target.value = e.target.value.slice(0, -1);
            }
        });
        input.addEventListener('change', obtenerRestricciones);
    });
});
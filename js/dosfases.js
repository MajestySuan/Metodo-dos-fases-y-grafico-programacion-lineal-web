
function decimalToFraction(value, maxDenominator = 1000) {
    if (value === 0) return "0";
    let negative = false;
    if (value < 0) {
        negative = true;
        value = -value;
    }
    let bestNumerator = 1, bestDenominator = 1, bestError = Math.abs(value - 1);
    for (let denom = 1; denom <= maxDenominator; denom++) {
        let numer = Math.round(value * denom);
        let error = Math.abs(value - numer / denom);
        if (error < bestError) {
            bestNumerator = numer;
            bestDenominator = denom;
            bestError = error;
            if (error < 1e-8) break;
        }
    }
    function gcd(a, b) { return b ? gcd(b, a % b) : a; }
    let divisor = gcd(bestNumerator, bestDenominator);
    bestNumerator /= divisor;
    bestDenominator /= divisor;
    let result = (bestDenominator === 1) ? `${bestNumerator}` : `${bestNumerator}/${bestDenominator}`;
    if (negative) result = "-" + result;
    return result;
}


let nombres = [];
let Cj = [];
let base = [];
let tableau = [];
let artificiales = [];
let coefObjOriginal = [];
let historialFase1 = [];
let historialFase2 = [];
let restriccionesGlobal = [];
let numVariablesGlobal = 0;
let tipoObjetivo = "max";


function construirTablaFase1(numVariables, restricciones, coefObj) {
    numVariablesGlobal = numVariables;
    restriccionesGlobal = restricciones;
   
    let n = numVariables;
    let m = restricciones.length;
    let numS = 0, numR = 0, numH = 0;
    let tipoVarPorRestriccion = [];
    for (let i = 0; i < m; i++) {
        let tipo = restricciones[i].tipo;
        if (tipo === "<=") {
            numH++;
            tipoVarPorRestriccion.push({ h: numH });
        } else if (tipo === ">=") {
            numS++;
            numR++;
            tipoVarPorRestriccion.push({ s: numS, r: numR });
        } else if (tipo === "=") {
            numR++;
            tipoVarPorRestriccion.push({ r: numR });
        }
    }
    
    nombres = [];
    let idxMap = {};
    let col = 0;
    for (let i = 0; i < n; i++) { nombres.push(`X${i+1}`); idxMap[`X${i+1}`] = col++; }
    for (let i = 1; i <= numS; i++) { nombres.push(`S${i}`); idxMap[`S${i}`] = col++; }
    for (let i = 1; i <= numR; i++) { nombres.push(`R${i}`); idxMap[`R${i}`] = col++; }
    for (let i = 1; i <= numH; i++) { nombres.push(`H${i}`); idxMap[`H${i}`] = col++; }

  
    tableau = [];
    base = [];
    artificiales = [];
    for (let i = 0; i < m; i++) {
        let fila = Array(nombres.length).fill(0);
        // X
        for (let j = 0; j < n; j++) fila[j] = restricciones[i].coefs[j];
        let tipo = restricciones[i].tipo;
        if (tipo === "<=") {
            let hName = `H${tipoVarPorRestriccion[i].h}`;
            fila[idxMap[hName]] = 1;
            base.push(idxMap[hName]);
        } else if (tipo === ">=") {
            let sName = `S${tipoVarPorRestriccion[i].s}`;
            let rName = `R${tipoVarPorRestriccion[i].r}`;
            fila[idxMap[sName]] = -1;
            fila[idxMap[rName]] = 1;
            base.push(idxMap[rName]);
            artificiales.push(idxMap[rName]);
        } else if (tipo === "=") {
            let rName = `R${tipoVarPorRestriccion[i].r}`;
            fila[idxMap[rName]] = 1;
            base.push(idxMap[rName]);
            artificiales.push(idxMap[rName]);
        }
        fila.push(restricciones[i].LD);
        tableau.push(fila);
    }
    
    Cj = Array(nombres.length).fill(0);
    for (let i = 1; i <= numR; i++) Cj[idxMap[`R${i}`]] = -1;
    coefObjOriginal = coefObj.slice(); 
}


function construirTablaFase2() {
 
    let nuevasNombres = [];
    let nuevasCj = [];
    let idxMap = {};
    let col = 0;
    for (let i = 0; i < nombres.length; i++) {
        if (!nombres[i].startsWith('R')) {
            nuevasNombres.push(nombres[i]);
            idxMap[nombres[i]] = col++;
            if (nombres[i].startsWith('X')) {
                let idx = parseInt(nombres[i].substring(1)) - 1;
                nuevasCj.push(coefObjOriginal[idx]);
            } else {
                nuevasCj.push(0);
            }
        }
    }
  
    let colsToKeep = [];
    for (let i = 0; i < nombres.length; i++) {
        if (!nombres[i].startsWith('R')) colsToKeep.push(i);
    }
    let nuevoTableau = tableau.map(fila => {
        let nuevaFila = colsToKeep.map(idx => fila[idx]);
        nuevaFila.push(fila[fila.length-1]);
        return nuevaFila;
    });
  
    let nuevaBase = base.map(idx => {
        let nombre = nombres[idx];
        return idxMap[nombre] !== undefined ? idxMap[nombre] : -1;
    });
    nombres = nuevasNombres;
    Cj = nuevasCj;
    base = nuevaBase;
    tableau = nuevoTableau;
}


function calcularZjCj(tableauLoc, baseLoc, CjLoc) {
  let Zj = Array(CjLoc.length).fill(0);
  for (let i = 0; i < tableauLoc.length; i++) {
    let coefBase = CjLoc[baseLoc[i]];
    for (let j = 0; j < CjLoc.length; j++) {
      Zj[j] += coefBase * tableauLoc[i][j];
    }
  }
  let Z = 0;
  for (let i = 0; i < tableauLoc.length; i++) {
    Z += CjLoc[baseLoc[i]] * tableauLoc[i][tableauLoc[0].length - 1];
  }
  let Zj_Cj = Zj.map((z, j) => z - CjLoc[j]);
  return { Zj_Cj, Z };
}


function renderSimplexTable({ nombres, Cj, base, tableau, Zj_Cj, Z }) {
    let html = `<table class="simplex-table">`;

    html += `<tr><th>Cj</th><th></th><th></th>`;
    nombres.forEach(n => html += `<th>${decimalToFraction(Cj[nombres.indexOf(n)])}</th>`);
    html += `<th>BI</th></tr>`;

    html += `<tr><th></th><th>Cb</th><th>Base</th>`;
    nombres.forEach(n => html += `<th>${n}</th>`);
    html += `<th>BI</th></tr>`;

    for (let i = 0; i < tableau.length; i++) {
        let baseIdx = base[i];
        let baseName = nombres[baseIdx];
        let cb = Cj[baseIdx];
        html += `<tr><td></td><td>${decimalToFraction(cb)}</td><td>${baseName}</td>`;
        for (let j = 0; j < nombres.length; j++) {
            html += `<td>${decimalToFraction(tableau[i][j])}</td>`;
        }
        html += `<td>${decimalToFraction(tableau[i][tableau[i].length - 1])}</td></tr>`;
    }

    html += `<tr><td colspan="3">Zj-Cj</td>`;
    Zj_Cj.forEach(val => html += `<td>${decimalToFraction(val)}</td>`);
    html += `<td>${decimalToFraction(Z)}</td></tr>`;

    html += `</table>`;
    return html;
}


function mostrarTablaSimplex(historial, fase) {
    let html = `<h3>Fase ${fase}: Tablas Simplex</h3>`;
    historial.forEach((estado, idx) => {
        html += `<div><strong>Iteración ${idx+1}</strong>`;
        html += renderSimplexTable(estado);
        html += `</div>`;
    });
    return html;
}


function simplexConHistorial(historial, esFase1) {
  let iter = 0;
  let nombresLoc = nombres.slice();
  let tableauLoc = tableau.map(f => f.slice());
  let baseLoc = base.slice();
  let CjLoc = Cj.slice();

  console.log("🚀 Inicia simplexConHistorial, esFase1 =", esFase1);
  console.log("Tableau inicial fase", esFase1 ? 1 : 2, tableauLoc);

  while (true) {
    let { Zj_Cj, Z } = calcularZjCj(tableauLoc, baseLoc, CjLoc);
    console.log("Iteración", iter + 1, "Zj-Cj =", Zj_Cj);
    console.log("Z =", Z);
    
    historial.push({
      nombres: nombresLoc.slice(),
      tableau: tableauLoc.map(f => f.slice()),
      base: baseLoc.slice(),
      Cj: CjLoc.slice(),
      Zj_Cj: Zj_Cj.slice(),
      Z: Z
    });

    let colPiv = -1;
    if (esFase1) {
  let min = Infinity;
  for (let j = 0; j < Zj_Cj.length; j++) {
    if (Zj_Cj[j] < min) {
      min = Zj_Cj[j];
      colPiv = j;
    }
  }
  if (min >= -1e-8) break; 
} else {
  if (tipoObjetivo === "max") {
    let max = -Infinity;
    for (let j = 0; j < Zj_Cj.length; j++) {
      if (Zj_Cj[j] > max) {
        max = Zj_Cj[j];
        colPiv = j;
      }
    }
    if (max <= 1e-8) break; 
  } else {
    let min = Infinity;
    for (let j = 0; j < Zj_Cj.length; j++) {
      if (Zj_Cj[j] < min) {
        min = Zj_Cj[j];
        colPiv = j;
      }
    }
    if (min >= -1e-8) break; 
  }
}

    console.log("🟩 Columna pivote seleccionada:", colPiv);

    let minRatio = Infinity, filaPiv = -1;
    console.log("🟨 Buscando fila pivote...");
    for (let i = 0; i < tableauLoc.length; i++) {
      let aij = tableauLoc[i][colPiv];
      let bi = tableauLoc[i][tableauLoc[0].length - 1];
      console.log(`  Fila ${i}: aij=${aij}, BI=${bi}`);
      if (aij > 1e-12) {
        let ratio = bi / aij;
        console.log(`    ➜ ratio=${ratio}`);
        if (ratio >= 0 && ratio < minRatio) {
          minRatio = ratio;
          filaPiv = i;
        }
      }
    }
    if (filaPiv === -1) {
      console.warn("🔻 No encontró fila pivote: problema no acotado");
      break;
    }
    console.log("✔️ Fila pivote:", filaPiv, "minRatio:", minRatio);

    let pivote = tableauLoc[filaPiv][colPiv];
    for (let j = 0; j < tableauLoc[0].length; j++) {
      tableauLoc[filaPiv][j] /= pivote;
    }
    for (let i = 0; i < tableauLoc.length; i++) {
      if (i !== filaPiv) {
        let factor = tableauLoc[i][colPiv];
        for (let j = 0; j < tableauLoc[0].length; j++) {
          tableauLoc[i][j] -= factor * tableauLoc[filaPiv][j];
        }
      }
    }
    baseLoc[filaPiv] = colPiv;
    console.log("✅ Tabla luego del pivoteo");
    console.table(tableauLoc);

    iter++;
    if (iter > 50) {
      console.warn("Se detuvo por exceso de iteraciones");
      break;
    }
    if (esFase1 && Math.abs(Z) < 1e-8) {
    console.log("✅ Fase 1 completada, Z ≈ 0. Transición a Fase 2.");
    break;
    }
  }

  console.log("🚫 Sale del bucle simplexConHistorial");
  console.log("Base final:", baseLoc.map(i => nombresLoc[i]));
  console.log("BI final:", tableauLoc.map(r => r[r.length - 1]));

  nombres = nombresLoc;
  tableau = tableauLoc;
  base = baseLoc;
  Cj = CjLoc;
}


function mostrarEstadoPrimalFase1() {
    const div = document.getElementById('solucion-info');
    let html = `<h3>Estado primal inicial (Fase 1)</h3><ul>`;
    restriccionesGlobal.forEach((r, i) => {
        let eq = '';
        for (let j = 0; j < numVariablesGlobal; j++) {
            if (r.coefs[j] !== 0) {
                eq += (r.coefs[j] > 0 && j > 0 ? ' + ' : (r.coefs[j] < 0 ? ' - ' : '')) +
                    (Math.abs(r.coefs[j]) === 1 ? '' : Math.abs(r.coefs[j])) +
                    `x${j+1}`;
            }
        }
        if (r.tipo === "<=") {
            eq += ` + H${i+1}`;
        } else if (r.tipo === ">=") {
            eq += ` - S${i+1} + R${i+1}`;
        } else if (r.tipo === "=") {
            eq += ` + R${i+1}`;
        }
        eq += ` = ${r.LD}`;
        html += `<li>${eq}</li>`;
    });
    let terms = [];
    let numR = 0;
    restriccionesGlobal.forEach((r) => {
        if (r.tipo === ">=" || r.tipo === "=") numR++;
    });
    for (let i = 1; i <= numR; i++) terms.push(`R${i}`);
    html += `<li><b>Función objetivo auxiliar:</b> W = ${terms.join(' + ')} → min</li>`;
    html += `</ul>`;
    div.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    const coefZDiv = document.getElementById('coeficientes-z');
    const listaRestricciones = document.getElementById('lista-restricciones');
    const btnAnadir = document.getElementById('btn-anadir');
    const btnResolver = document.getElementById('btn-resolver');
    const btnGenerar = document.getElementById('btn-generar');
    const numVariablesInput = document.getElementById('num-variables');
    const selectorObjetivo = document.getElementById('tipo-objetivo');
    const pasoAPasoDiv = document.getElementById('paso-a-paso');

    btnAnadir.disabled = true;
    btnResolver.disabled = true;

    btnGenerar.onclick = () => {
        const num = parseInt(numVariablesInput.value);
        if (num < 1 || num > 20) {
            alert('Por favor ingrese un número entre 1 y 20');
            return;
        }
        renderCoeficientesZ(num);
        listaRestricciones.innerHTML = '';
        btnAnadir.disabled = false;
        btnResolver.disabled = false;
    };

    function renderCoeficientesZ(numVariables) {
        coefZDiv.innerHTML = '';
        for (let i = 0; i < numVariables; i++) {
            const div = document.createElement('div');
            div.className = 'input-coeficiente';
            div.innerHTML = `
                <input type="number" class="coef-input" id="z-coef-${i}" value="0" step="any">
                <span class="variable">x<sub>${i+1}</sub></span>
                ${i < numVariables - 1 ? '<span class="operador">+</span>' : ''}
            `;
            coefZDiv.appendChild(div);
        }
    }

    function addRestriccion() {
        const idx = listaRestricciones.children.length;
        const div = document.createElement('div');
        div.className = 'restriccion';
        let camposHTML = '';
        let numVariables = coefZDiv.querySelectorAll('input').length;
        for (let i = 0; i < numVariables; i++) {
            camposHTML += `
                <input type="number" class="coef-input" id="r${idx}-coef-${i}" value="0" step="any">
                <span class="variable">x<sub>${i+1}</sub></span>
                ${i < numVariables - 1 ? '<span class="operador">+</span>' : ''}
            `;
        }
        div.innerHTML = `
            <div class="restriccion-campos">
                ${camposHTML}
                <select class="operador-restriccion" id="r${idx}-op">
                    <option value="<=">≤</option>
                    <option value="=">=</option>
                    <option value=">=">≥</option>
                </select>
                <input type="number" class="valor-restriccion" id="r${idx}-valor" value="0" step="any">
            </div>
            <button type="button" class="btn-eliminar" data-idx="${idx}">&times;</button>
        `;
        listaRestricciones.appendChild(div);
        div.querySelector('.btn-eliminar').onclick = () => {
            listaRestricciones.removeChild(div);
        };
    }

    btnAnadir.onclick = () => addRestriccion();

    btnResolver.onclick = () => {
        let numVariables = coefZDiv.querySelectorAll('input').length;
        let coefObj = [];
        for (let i = 0; i < numVariables; i++) {
            coefObj.push(Number(document.getElementById(`z-coef-${i}`).value));
        }
        let restriccionesData = [];
        let restrDivs = document.querySelectorAll('#lista-restricciones .restriccion');
        restrDivs.forEach((div, idx) => {
            let coefs = [];
            for (let i = 0; i < numVariables; i++) {
                coefs.push(Number(div.querySelector(`#r${idx}-coef-${i}`).value));
            }
            let tipo = div.querySelector(`#r${idx}-op`).value;
            let LD = Number(div.querySelector(`#r${idx}-valor`).value);
            restriccionesData.push({coefs, tipo, LD});
        });
        tipoObjetivo = selectorObjetivo.value;

        construirTablaFase1(numVariables, restriccionesData, coefObj);
        mostrarEstadoPrimalFase1();
        historialFase1 = [];
        simplexConHistorial(historialFase1, true);

        let artificialesEnBase = false;
        for (let idx of artificiales) {
            let pos = base.indexOf(idx);
            if (pos !== -1 && Math.abs(tableau[pos][tableau[0].length-1]) > 1e-5) {
                artificialesEnBase = true;
                break;
            }
        }

        historialFase2 = [];
        if (!artificialesEnBase) {
            construirTablaFase2();
            simplexConHistorial(historialFase2, false);
        }

        let html = mostrarTablaSimplex(historialFase1, 1);
        if (!artificialesEnBase && historialFase2.length > 0) {
            html += mostrarTablaSimplex(historialFase2, 2);
        } else if (artificialesEnBase) {
            html += `<div class="solucion-info"><b>No existe solución factible (variables artificiales en base con valor distinto de cero).</b></div>`;
        }
        pasoAPasoDiv.innerHTML = html;
            };

});

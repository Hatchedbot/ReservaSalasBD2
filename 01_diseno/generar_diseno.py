"""Genera el diagrama relacional (draw.io + SVG) y el diccionario de datos
(Excel + HTML para PDF) a partir de metadatos.json, que se exporta del
diccionario de Oracle con 04_app/tools/exportar_metadatos.js.

Uso:  python generar_diseno.py
"""
import html
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape as xesc

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

AQUI = Path(__file__).resolve().parent
ESQUEMA = "LM_RESERVASALAS"


def q(tabla):
    """Nombre completo de la tabla en Oracle: esquema.tabla"""
    return f"{ESQUEMA}.{tabla}"

META = json.loads((AQUI / "metadatos.json").read_text(encoding="utf-8"))

ORDEN = ["FACULTAD", "USUARIO", "EDIFICIO", "TIPO_ESPACIO", "ESPACIO",
         "RECURSO", "ESPACIO_RECURSO", "RESERVA", "AUDITORIA"]
POS = {  # posicion de cada tabla en el diagrama
    "FACULTAD": (40, 40), "USUARIO": (440, 40), "RESERVA": (840, 40), "AUDITORIA": (1240, 40),
    "EDIFICIO": (40, 410), "ESPACIO": (440, 410), "ESPACIO_RECURSO": (840, 410),
    "RECURSO": (1240, 440), "TIPO_ESPACIO": (40, 640),
}
ANCHO, CAB, FILA = 340, 30, 22
TIPO_TXT = {"C": "CHECK", "P": "PRIMARY KEY", "U": "UNIQUE", "R": "FOREIGN KEY"}


def tipo_dato(c):
    t = c["DATA_TYPE"]
    if t == "NUMBER":
        if c["DATA_PRECISION"] is None:
            return "NUMBER"
        return f"NUMBER({c['DATA_PRECISION']}{',' + str(c['DATA_SCALE']) if c['DATA_SCALE'] else ''})"
    if t in ("VARCHAR2", "CHAR", "NVARCHAR2"):
        return f"{t}({c['CHAR_LENGTH']})"
    return t


def limpiar_defecto(d):
    if d is None:
        return ""
    d = d.strip()
    if '"ISEQ$$' in d:
        return "IDENTITY"
    return d


# ------------------------------------------------------------------ modelo
cols_por_tabla = {}
for c in META["columnas"]:
    cols_por_tabla.setdefault(c["TABLE_NAME"], []).append(c)
restr = META["restricciones"]
pk = {r["TABLE_NAME"]: [x.strip() for x in r["COLUMNAS"].split(",")] for r in restr if r["CONSTRAINT_TYPE"] == "P"}
uq = {}
for r in restr:
    if r["CONSTRAINT_TYPE"] == "U":
        for x in r["COLUMNAS"].split(","):
            uq.setdefault(r["TABLE_NAME"], set()).add(x.strip())
fks = [r for r in restr if r["CONSTRAINT_TYPE"] == "R"]
fk_cols = {(r["TABLE_NAME"], r["COLUMNAS"].strip()): r["TABLA_REF"] for r in fks}
coment_tabla = {t["TABLE_NAME"]: t["COMMENTS"] or "" for t in META["tablas"]}
tablas = [t for t in ORDEN if t in cols_por_tabla] + sorted(set(cols_por_tabla) - set(ORDEN))


def marcas(tabla, col):
    m = []
    if col in pk.get(tabla, []):
        m.append("PK")
    if (tabla, col) in fk_cols:
        m.append("FK")
    if col in uq.get(tabla, set()):
        m.append("UQ")
    return m


# ------------------------------------------------------------------ draw.io
def drawio():
    celdas = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    filas_id = {}
    for t in tablas:
        x, y = POS.get(t, (40, 900))
        cols = cols_por_tabla[t]
        alto = CAB + FILA * len(cols)
        color = "#4a1760;strokeColor=#4a1760;swimlaneFillColor=#ffffff"
        celdas.append(
            f'<mxCell id="t_{t}" value="{xesc(q(t))}" style="swimlane;fontStyle=1;fontFamily=Calibri;fontColor=#ffffff;childLayout=stackLayout;'
            f'horizontal=1;startSize={CAB};horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;'
            f'collapsible=1;marginBottom=0;html=1;fillColor={color};fontSize=13;" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{ANCHO}" height="{alto}" as="geometry"/></mxCell>')
        for i, c in enumerate(cols):
            cid = f"c_{t}_{c['COLUMN_NAME']}"
            filas_id[(t, c["COLUMN_NAME"])] = cid
            mk = marcas(t, c["COLUMN_NAME"])
            nn = "" if c["NULLABLE"] == "Y" else " NN"
            negrita = "fontStyle=1;" if "PK" in mk else ""
            texto = f"{'/'.join(mk):<6} {c['COLUMN_NAME']} : {tipo_dato(c)}{nn}"
            celdas.append(
                f'<mxCell id="{cid}" value="{xesc(texto)}" style="text;strokeColor=none;fillColor=none;align=left;'
                f'verticalAlign=middle;spacingLeft=6;spacingRight=4;overflow=hidden;rotatable=0;'
                f'points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontFamily=Calibri;fontColor=#000000;fontSize=12;{negrita}" '
                f'vertex="1" parent="t_{t}"><mxGeometry y="{CAB + i * FILA}" width="{ANCHO}" height="{FILA}" as="geometry"/></mxCell>')
    for n, r in enumerate(fks):
        hijo = filas_id[(r["TABLE_NAME"], r["COLUMNAS"].strip())]
        padre_pk = pk[r["TABLA_REF"]][0]
        padre = filas_id[(r["TABLA_REF"], padre_pk)]
        celdas.append(
            f'<mxCell id="e{n}" value="{xesc(r["CONSTRAINT_NAME"])}" style="edgeStyle=entityRelationEdgeStyle;'
            f'fontSize=9;html=1;endArrow=ERmandOne;startArrow=ERmany;endFill=0;startFill=0;'
            f'strokeColor=#4a1760;fontColor=#000000;fontFamily=Calibri;labelBackgroundColor=#ffffff;" edge="1" parent="1" source="{hijo}" target="{padre}">'
            f'<mxGeometry relative="1" as="geometry"/></mxCell>')
    celdas.append(
        '<mxCell id="titulo" value="&lt;b&gt;LM_RESERVASALAS&lt;/b&gt; - Modelo relacional del Sistema de Reserva '
        'de Salas Universitario (Oracle) - Grupo Lara y Malagón" style="text;html=1;fontFamily=Calibri;fontColor=#000000;fontSize=15;align=left;" '
        'vertex="1" parent="1"><mxGeometry x="40" y="5" width="1100" height="30" as="geometry"/></mxCell>')
    celdas.append(
        '<mxCell id="nota" value="AUDITORIA no tiene llaves foráneas: registra los cambios de TODAS las tablas '
        'mediante los triggers TRG_AUD_&lt;TABLA&gt; generados por PKG_AUDITORIA." style="shape=note;whiteSpace=wrap;'
        'html=1;fillColor=#f1eaf5;strokeColor=#4a1760;fontFamily=Calibri;fontColor=#000000;fontSize=11;align=left;spacingLeft=6;" vertex="1" parent="1">'
        '<mxGeometry x="1240" y="740" width="340" height="60" as="geometry"/></mxCell>')
    xml = ('<mxfile host="app.diagrams.net"><diagram id="lm" name="Modelo relacional">'
           '<mxGraphModel dx="1600" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" '
           'fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169" math="0" shadow="0"><root>'
           + "".join(celdas) + "</root></mxGraphModel></diagram></mxfile>")
    (AQUI / "diagrama_relacional.drawio").write_text(xml, encoding="utf-8")


# ------------------------------------------------------------------ SVG
def svg():
    partes = []
    yfila = {}
    caja = {}
    for t in tablas:
        x, y = POS.get(t, (40, 900))
        cols = cols_por_tabla[t]
        alto = CAB + FILA * len(cols)
        caja[t] = (x, y, alto)
        aud = t == "AUDITORIA"
        fondo, borde = ("#4a1760", "#4a1760")
        partes.append(f'<rect x="{x}" y="{y}" width="{ANCHO}" height="{alto}" fill="#fff" stroke="{borde}" stroke-width="1.5" rx="4"/>')
        partes.append(f'<rect x="{x}" y="{y}" width="{ANCHO}" height="{CAB}" fill="{fondo}" stroke="{borde}" stroke-width="1.5" rx="4"/>')
        partes.append(f'<text x="{x + ANCHO / 2}" y="{y + 20}" text-anchor="middle" font-weight="bold" font-size="14" fill="#ffffff">{xesc(q(t))}</text>')
        for i, c in enumerate(cols):
            fy = y + CAB + i * FILA
            yfila[(t, c["COLUMN_NAME"])] = fy + FILA / 2
            mk = marcas(t, c["COLUMN_NAME"])
            if i % 2:
                partes.append(f'<rect x="{x + 1}" y="{fy}" width="{ANCHO - 2}" height="{FILA}" fill="#f6f4f8"/>')
            peso = ' font-weight="bold"' if "PK" in mk else ""
            nn = "" if c["NULLABLE"] == "Y" else " NN"
            partes.append(f'<text x="{x + 8}" y="{fy + 15}" font-family="Calibri, sans-serif" font-size="12" font-weight="bold" fill="#000000">{xesc("/".join(mk))}</text>')
            partes.append(f'<text x="{x + 58}" y="{fy + 15}" font-family="Calibri, sans-serif" font-size="12"{peso}>'
                          f'{xesc(c["COLUMN_NAME"])} <tspan fill="#404040">{xesc(tipo_dato(c))}{nn}</tspan></text>')
    lineas = []
    for r in fks:
        h, p = r["TABLE_NAME"], r["TABLA_REF"]
        hx, _, _ = caja[h]
        px, _, _ = caja[p]
        sy = yfila[(h, r["COLUMNAS"].strip())]
        ey = yfila[(p, pk[p][0])]
        if px > hx:
            sx, ex, d = hx + ANCHO, px, 1
        else:
            sx, ex, d = hx, px + ANCHO, -1
        mx = (sx + ex) / 2
        lineas.append(f'<path d="M{sx},{sy} H{mx} V{ey} H{ex}" fill="none" stroke="#4a1760" stroke-width="1.3"/>')
        # muchos (pata de gallo) en el hijo
        lineas.append(f'<path d="M{sx + 12 * d},{sy} L{sx},{sy - 6} M{sx + 12 * d},{sy} L{sx},{sy + 6} '
                      f'M{sx + 16 * d},{sy - 6} V{sy + 6}" stroke="#4a1760" stroke-width="1.3" fill="none"/>')
        # uno y solo uno en el padre
        lineas.append(f'<path d="M{ex - 8 * d},{ey - 6} V{ey + 6} M{ex - 13 * d},{ey - 6} V{ey + 6}" stroke="#4a1760" stroke-width="1.3"/>')
    nota = ('<rect x="1240" y="740" width="340" height="60" fill="#f1eaf5" stroke="#4a1760"/>'
            '<text x="1250" y="762" font-size="11">AUDITORIA no tiene llaves foráneas: registra los</text>'
            '<text x="1250" y="777" font-size="11">cambios de TODAS las tablas mediante los triggers</text>'
            '<text x="1250" y="792" font-size="11">TRG_AUD_&lt;TABLA&gt; generados por PKG_AUDITORIA.</text>')
    leyenda = ('<text x="40" y="880" font-size="12" fill="#000000">PK = llave primaria, FK = llave foránea, '
               'UQ = único, NN = NOT NULL. Relaciones 1 a muchos (pata de gallo en el lado "muchos")</text>')
    titulo = ('<text x="40" y="26" font-size="16"><tspan font-weight="bold">LM_RESERVASALAS</tspan> - Modelo relacional '
              'del Sistema de Reserva de Salas Universitario (Oracle) - Grupo Lara y Malagón</text>')
    cuerpo = "".join(lineas) + "".join(partes)
    svg_txt = (f'<svg xmlns="http://www.w3.org/2000/svg" width="1620" height="900" viewBox="0 0 1620 900" '
               f'font-family="Calibri, sans-serif" fill="#000000"><rect width="100%" height="100%" fill="#ffffff"/>'
               f'{titulo}{cuerpo}{nota}{leyenda}</svg>')
    (AQUI / "diagrama_relacional.svg").write_text(svg_txt, encoding="utf-8")
    (AQUI / "_diagrama_render.html").write_text(
        f'<!doctype html><html><head><meta charset="utf-8"><style>html,body{{margin:0;background:#fff}}</style></head>'
        f'<body>{svg_txt}</body></html>', encoding="utf-8")


# ------------------------------------------------------------------ Excel
def excel():
    wb = Workbook()
    azul = PatternFill("solid", fgColor="4A1760")
    claro = PatternFill("solid", fgColor="F1EAF5")
    gris = PatternFill("solid", fgColor="F6F4F8")
    blanco = Font(name="Calibri", color="FFFFFF", bold=True)
    fino = Side(style="thin", color="CFC4D8")
    borde = Border(left=fino, right=fino, top=fino, bottom=fino)
    ajuste = Alignment(wrap_text=True, vertical="top")

    def encabezado(ws, fila, valores):
        for j, v in enumerate(valores, 1):
            c = ws.cell(row=fila, column=j, value=v)
            c.fill, c.font, c.border, c.alignment = azul, blanco, borde, Alignment(vertical="center", wrap_text=True)

    def anchos(ws, lista):
        for j, w in enumerate(lista, 1):
            ws.column_dimensions[get_column_letter(j)].width = w

    # Hoja 1: resumen
    ws = wb.active
    ws.title = "Resumen"
    ws["A1"] = "Diccionario de Datos - LM_RESERVASALAS"
    ws["A1"].font = Font(name="Calibri", bold=True, size=16, color="000000")
    ws["A2"] = "Sistema de Reserva de Salas Universitario · Oracle AI Database 26ai Free · Grupo: Lara / Malagon"
    ws["A3"] = "Prefijo LM_ = iniciales de los apellidos Lara y Malagon"
    encabezado(ws, 5, ["#", "Tabla", "Descripcion", "Columnas", "Llave primaria", "Registros"])
    for i, t in enumerate(tablas, 1):
        fila = [i, q(t), coment_tabla.get(t, ""), len(cols_por_tabla[t]), ", ".join(pk.get(t, [])), META["conteos"].get(t, 0)]
        for j, v in enumerate(fila, 1):
            c = ws.cell(row=5 + i, column=j, value=v)
            c.border, c.alignment = borde, ajuste
    anchos(ws, [5, 34, 70, 11, 28, 11])

    # Hoja 2: diccionario de columnas
    ws = wb.create_sheet("Diccionario")
    cab = ["Tabla", "#", "Columna", "Tipo de dato", "Nulo", "Llave", "Valor por defecto", "Restricciones", "Descripcion"]
    fila = 1
    chk_por_col = {}
    for r in restr:
        if r["CONSTRAINT_TYPE"] == "C" and r["SEARCH_CONDITION_VC"] and "IS NOT NULL" not in r["SEARCH_CONDITION_VC"]:
            for col in cols_por_tabla.get(r["TABLE_NAME"], []):
                if re.search(rf'\b{col["COLUMN_NAME"]}\b', r["SEARCH_CONDITION_VC"]):
                    chk_por_col.setdefault((r["TABLE_NAME"], col["COLUMN_NAME"]), []).append(
                        f'{r["CONSTRAINT_NAME"]}: {r["SEARCH_CONDITION_VC"]}')
    for t in tablas:
        c = ws.cell(row=fila, column=1, value=f"{q(t)} — {coment_tabla.get(t, '')}")
        c.font = Font(name="Calibri", bold=True, size=12, color="000000")
        c.fill = claro
        ws.merge_cells(start_row=fila, start_column=1, end_row=fila, end_column=len(cab))
        fila += 1
        encabezado(ws, fila, cab)
        fila += 1
        for i, col in enumerate(cols_por_tabla[t]):
            mk = marcas(t, col["COLUMN_NAME"])
            restricciones = []
            if (t, col["COLUMN_NAME"]) in fk_cols:
                restricciones.append(f"Referencia a {q(fk_cols[(t, col['COLUMN_NAME'])])}")
            restricciones += chk_por_col.get((t, col["COLUMN_NAME"]), [])
            valores = [q(t), col["COLUMN_ID"], col["COLUMN_NAME"], tipo_dato(col),
                       "SI" if col["NULLABLE"] == "Y" else "NO", ", ".join(mk),
                       limpiar_defecto(col["DATA_DEFAULT"]) if col["IDENTITY_COLUMN"] != "YES" else "IDENTITY (autoincremental)",
                       "\n".join(restricciones), col["COMMENTS"] or ""]
            for j, v in enumerate(valores, 1):
                c = ws.cell(row=fila, column=j, value=v)
                c.border, c.alignment = borde, ajuste
                if i % 2:
                    c.fill = gris
            fila += 1
        fila += 1
    anchos(ws, [32, 4, 22, 15, 6, 9, 22, 48, 52])
    ws.freeze_panes = "A1"

    # Hoja 3: restricciones
    ws = wb.create_sheet("Restricciones")
    encabezado(ws, 1, ["Tabla", "Restriccion", "Tipo", "Columnas", "Condicion / Referencia", "Al borrar"])
    f = 2
    for r in restr:
        if r["CONSTRAINT_TYPE"] == "C" and r["SEARCH_CONDITION_VC"] and r["SEARCH_CONDITION_VC"].endswith("IS NOT NULL"):
            continue
        cond = r["SEARCH_CONDITION_VC"] or (f"-> {r['TABLA_REF']}" if r["TABLA_REF"] else "")
        valores = [q(r["TABLE_NAME"]), r["CONSTRAINT_NAME"], TIPO_TXT.get(r["CONSTRAINT_TYPE"], r["CONSTRAINT_TYPE"]),
                   r["COLUMNAS"], cond, r["DELETE_RULE"] or ""]
        for j, v in enumerate(valores, 1):
            c = ws.cell(row=f, column=j, value=v)
            c.border, c.alignment = borde, ajuste
        f += 1
    anchos(ws, [32, 26, 13, 26, 70, 12])

    # Hoja 4: indices y triggers
    ws = wb.create_sheet("Indices y triggers")
    encabezado(ws, 1, ["Tabla", "Indice", "Tipo", "Columnas"])
    f = 2
    for r in META["indices"]:
        for j, v in enumerate([q(r["TABLE_NAME"]), r["INDEX_NAME"], r["UNIQUENESS"], r["COLUMNAS"]], 1):
            ws.cell(row=f, column=j, value=v).border = borde
        f += 1
    f += 1
    encabezado(ws, f, ["Tabla", "Trigger", "Tipo", "Evento"])
    f += 1
    for r in META["triggers"]:
        for j, v in enumerate([q(r["TABLE_NAME"]), r["TRIGGER_NAME"], r["TRIGGER_TYPE"], r["TRIGGERING_EVENT"]], 1):
            ws.cell(row=f, column=j, value=v).border = borde
        f += 1
    anchos(ws, [32, 30, 20, 40])

    wb.save(AQUI / "diccionario_datos.xlsx")


# ------------------------------------------------------------------ HTML (para PDF)
def html_diccionario():
    e = html.escape
    filas = []
    for t in tablas:
        filas.append(f'<h2>{e(q(t))}</h2><p class="d">{e(coment_tabla.get(t, ""))}. Registros: {META["conteos"].get(t, 0)}</p>')
        filas.append('<table><tr><th>#</th><th>Columna</th><th>Tipo</th><th>Nulo</th><th>Llave</th>'
                     '<th>Defecto</th><th>Descripción</th></tr>')
        for col in cols_por_tabla[t]:
            mk = ", ".join(marcas(t, col["COLUMN_NAME"]))
            if (t, col["COLUMN_NAME"]) in fk_cols:
                mk += f' → {q(fk_cols[(t, col["COLUMN_NAME"])])}'
            defecto = "IDENTITY" if col["IDENTITY_COLUMN"] == "YES" else limpiar_defecto(col["DATA_DEFAULT"])
            filas.append(f'<tr><td>{col["COLUMN_ID"]}</td><td><b>{e(col["COLUMN_NAME"])}</b></td><td>{e(tipo_dato(col))}</td>'
                         f'<td>{"Sí" if col["NULLABLE"] == "Y" else "No"}</td><td>{e(mk)}</td><td>{e(defecto)}</td>'
                         f'<td>{e(col["COMMENTS"] or "")}</td></tr>')
        filas.append("</table>")
        chks = [r for r in restr if r["TABLE_NAME"] == t and r["CONSTRAINT_TYPE"] in ("C", "U", "R", "P")
                and not (r["SEARCH_CONDITION_VC"] or "").endswith("IS NOT NULL")]
        if chks:
            filas.append('<table class="r"><tr><th>Restricción</th><th>Tipo</th><th>Columnas</th><th>Condición / referencia</th></tr>')
            for r in chks:
                cond = r["SEARCH_CONDITION_VC"] or (f"→ {q(r['TABLA_REF'])} (al borrar: {r['DELETE_RULE']})" if r["TABLA_REF"] else "")
                filas.append(f'<tr><td>{e(r["CONSTRAINT_NAME"])}</td><td>{TIPO_TXT[r["CONSTRAINT_TYPE"]]}</td>'
                             f'<td>{e(r["COLUMNAS"])}</td><td>{e(cond)}</td></tr>')
            filas.append("</table>")
    doc = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Diccionario de datos LM_RESERVASALAS</title>
<style>
 @page {{ size: A4 landscape; margin: 14mm; }}
 body {{ font-family: Calibri, Carlito, sans-serif; font-size: 11px; color: #000; }}
 h1 {{ color: #000; margin: 0 0 4px; }} h2 {{ color: #000; margin: 18px 0 2px; font-size: 15px; break-after: avoid; }}
 .d {{ margin: 0 0 6px; color: #000; }}
 table {{ width: 100%; border-collapse: collapse; margin-bottom: 6px; break-inside: auto; }}
 th {{ background: #4a1760; color: #fff; text-align: left; padding: 4px 6px; border: 1px solid #4a1760; }}
 td {{ border: 1px solid #cfc4d8; padding: 3px 6px; vertical-align: top; color: #000; }}
 tr:nth-child(even) td {{ background: #f6f4f8; }}
 tr {{ break-inside: avoid; }}
 table.r th {{ background: #5d2378; border-color: #5d2378; }}
</style></head><body>
<h1>Diccionario de Datos — LM_RESERVASALAS</h1>
<p>Sistema de Reserva de Salas Universitario · Oracle AI Database 26ai Free (PDB FREEPDB1) · Grupo Lara y Malagón.
 Generado desde el diccionario de Oracle (USER_TAB_COLUMNS, USER_CONSTRAINTS, comentarios).</p>
{''.join(filas)}
</body></html>"""
    (AQUI / "diccionario_datos.html").write_text(doc, encoding="utf-8")


if __name__ == "__main__":
    drawio()
    svg()
    excel()
    html_diccionario()
    print("Generados: diagrama_relacional.drawio, diagrama_relacional.svg, diccionario_datos.xlsx, diccionario_datos.html")

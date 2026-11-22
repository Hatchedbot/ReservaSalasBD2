// CRUD completo (insertar, consultar, actualizar, eliminar) desde la interfaz
const { test, expect, api, abrirTabla, buscarFila, llenar, MARCA } = require('./helpers');

test.describe.configure({ mode: 'serial' });

async function guardar(page, avisoEsperado) {
  await page.locator('#btnGuardar').click();
  await expect(page.locator('#dlg')).not.toBeVisible();
  await expect(page.locator('.toast').last()).toContainText(avisoEsperado);
}

async function eliminarDesdeFila(page, fila, titulo, avisoEsperado) {
  await fila.getByRole('button', { name: /^Eliminar registro/ }).click();
  const dlg = page.locator('#dlgConfirmar');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('heading')).toHaveText(titulo);
  await dlg.getByRole('button', { name: titulo }).click();
  await expect(page.locator('.toast').last()).toContainText(avisoEsperado);
}

test.describe('CRUD', () => {
  test('Facultades: crear, consultar, editar y eliminar', async ({ page }) => {
    const codigo = MARCA.slice(0, 10);
    await abrirTabla(page, 'Facultades');
    await page.getByRole('button', { name: 'Nueva facultad' }).click();
    await expect(page.locator('#dlgTitulo')).toHaveText('Nueva facultad');
    await llenar(page, 'CODIGO', codigo.toLowerCase()); // la app lo pasa a mayúsculas
    await llenar(page, 'NOMBRE', `${MARCA} Facultad de Pruebas`);
    await llenar(page, 'DECANO', 'Decano Inicial');
    await guardar(page, 'Facultad creada');

    let fila = await buscarFila(page, `${MARCA} Facultad de Pruebas`);
    await expect(fila).toContainText(codigo);
    await expect(fila).toContainText('Decano Inicial');

    await fila.getByRole('button', { name: /^Editar registro/ }).click();
    await expect(page.locator('#dlgTitulo')).toHaveText(/^Editar facultad \d+$/);
    await expect(page.locator('#f_ID_FACULTAD')).toBeDisabled();
    await llenar(page, 'DECANO', 'Decano Actualizado');
    await guardar(page, 'Facultad actualizada');
    fila = await buscarFila(page, `${MARCA} Facultad de Pruebas`);
    await expect(fila).toContainText('Decano Actualizado');

    await eliminarDesdeFila(page, fila, 'Eliminar facultad', 'Facultad eliminada');
    await expect(page.locator('#lista .vacio')).toContainText('Sin resultados');
  });

  test('Recursos: crear, editar y eliminar', async ({ page }) => {
    await abrirTabla(page, 'Recursos');
    await page.getByRole('button', { name: 'Nuevo recurso' }).click();
    await llenar(page, 'NOMBRE', `${MARCA} Proyector portátil`);
    await llenar(page, 'DESCRIPCION', 'Creado por la prueba E2E');
    await guardar(page, 'Recurso creado');
    let fila = await buscarFila(page, `${MARCA} Proyector portátil`);
    await fila.getByRole('button', { name: /^Editar registro/ }).click();
    await llenar(page, 'DESCRIPCION', 'Descripción editada');
    await guardar(page, 'Recurso actualizado');
    fila = await buscarFila(page, `${MARCA} Proyector portátil`);
    await expect(fila).toContainText('Descripción editada');
    await eliminarDesdeFila(page, fila, 'Eliminar recurso', 'Recurso eliminado');
  });

  test('Usuarios: listas desplegables de llaves foráneas y valores permitidos', async ({ page }) => {
    const documento = `99${String(Date.now()).slice(-8)}`;
    await abrirTabla(page, 'Usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await llenar(page, 'DOCUMENTO', documento);
    await llenar(page, 'NOMBRES', 'Usuario');
    await llenar(page, 'APELLIDOS', `${MARCA} Prueba`);
    await llenar(page, 'EMAIL', `${MARCA.toLowerCase()}@universidad.edu.co`);
    await llenar(page, 'TIPO_USUARIO', 'PROFESOR');
    await page.locator('#f_ID_FACULTAD').selectOption({ label: 'ING - Facultad de Ingenieria' });
    await guardar(page, 'Usuario creado');

    const fila = await buscarFila(page, documento);
    await expect(fila).toContainText('Profesor');                 // el valor PROFESOR se muestra en texto normal
    await expect(fila.locator('.placa', { hasText: 'ING' })).toBeVisible(); // el código de la facultad como placa
    await expect(fila.locator('.chip', { hasText: 'Activo' })).toBeVisible(); // valor por defecto de ESTADO
    await eliminarDesdeFila(page, fila, 'Eliminar usuario', 'Usuario eliminado');
  });

  test('Recursos por espacio: llave primaria compuesta', async ({ page, request }) => {
    const rec = await api(request, 'POST', 'RECURSO', { NOMBRE: `${MARCA} Parlante`, DESCRIPCION: 'Para la PK compuesta' });
    expect(rec.ok).toBeTruthy();
    await abrirTabla(page, 'Recursos por espacio');
    await page.getByRole('button', { name: 'Nuevo recurso de un espacio' }).click();
    await page.locator('#f_ID_ESPACIO').selectOption({ label: 'B9-401 - Aula 401' });
    await page.locator('#f_ID_RECURSO').selectOption({ label: `${MARCA} Parlante` });
    await llenar(page, 'CANTIDAD', 3);
    await guardar(page, 'Recurso de un espacio creado');

    let fila = await buscarFila(page, `${MARCA} Parlante`);
    await expect(fila).toContainText('3');
    await fila.getByRole('button', { name: /^Editar registro/ }).click();
    // En edición las dos columnas de la llave quedan bloqueadas
    await expect(page.locator('#f_ID_ESPACIO')).toBeDisabled();
    await expect(page.locator('#f_ID_RECURSO')).toBeDisabled();
    await llenar(page, 'CANTIDAD', 5);
    await guardar(page, 'Recurso de un espacio actualizado');
    fila = await buscarFila(page, `${MARCA} Parlante`);
    await expect(fila.locator('td.num')).toHaveText('5');
    await eliminarDesdeFila(page, fila, 'Eliminar recurso de un espacio', 'Recurso de un espacio eliminado');
    await api(request, 'DELETE', `RECURSO/${rec.cuerpo.id}`);
  });

  test('Reservas: crear, confirmar y eliminar desde la tabla', async ({ page }) => {
    await abrirTabla(page, 'Reservas');
    await page.getByRole('button', { name: 'Nueva reserva' }).click();
    await llenar(page, 'ID_USUARIO', 1);
    await llenar(page, 'ID_ESPACIO', 14);                  // B9-401 Aula 401
    await llenar(page, 'FECHA_INICIO', '2027-03-15T10:00');
    await llenar(page, 'FECHA_FIN', '2027-03-15T12:00');
    await llenar(page, 'NUM_ASISTENTES', 30);
    await llenar(page, 'MOTIVO', `${MARCA} Clase de prueba`);
    await guardar(page, /Reserva creada con el número \d+/);

    let fila = await buscarFila(page, `${MARCA} Clase de prueba`);
    await expect(fila).toContainText('2027-03-15 10:00');
    await expect(fila.locator('.chip')).toHaveText('Pendiente');
    await fila.getByRole('button', { name: /^Editar registro/ }).click();
    await llenar(page, 'ESTADO', 'CONFIRMADA');
    await guardar(page, 'Reserva actualizada');
    fila = await buscarFila(page, `${MARCA} Clase de prueba`);
    await expect(fila.locator('.chip')).toHaveText('Confirmada');
    await eliminarDesdeFila(page, fila, 'Eliminar reserva', 'Reserva eliminada');
  });
});

-- Categorías de documentos
INSERT INTO document_categories (name, description, active)
VALUES
    ('Formularios', 'Documentos institucionales descargables', TRUE),
    ('Especificaciones', 'Documentos tecnicos en PDF', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Documentos
INSERT INTO documents (
    category_id,
    code,
    title,
    description,
    document_type,
    file_name,
    file_path,
    mime_type,
    area,
    active
)
SELECT
    dc.id,
    x.code,
    x.title,
    x.description,
    x.document_type,
    x.file_name,
    x.file_path,
    x.mime_type,
    x.area,
    TRUE
FROM (
    VALUES
        (
            'Formularios',
            'solicitud-usuario',
            'Solicitud de usuario',
            'Formulario de alta o habilitacion de usuario institucional.',
            'docx',
            'solicitud-usuario.docx',
            'forms/solicitud-usuario.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Formularios'
        ),
        (
            'Formularios',
            'correo-institucional',
            'Solicitud de correo institucional',
            'Formulario para la asignacion de cuenta de correo institucional.',
            'docx',
            'correo-institucional.docx',
            'forms/correo-institucional.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Formularios'
        ),
        (
            'Formularios',
            'acceso-internet',
            'Solicitud de acceso a internet',
            'Formulario para la gestion de accesos a internet.',
            'docx',
            'acceso-internet.docx',
            'forms/acceso-internet.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Formularios'
        ),
        (
            'Formularios',
            'tv-proyector',
            'Solicitud de TV y proyector',
            'Solicitud de equipo audiovisual para actividades institucionales.',
            'xlsx',
            'tv-proyector.xlsx',
            'forms/tv-proyector.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Formularios'
        ),
        (
            'Formularios',
            'usuario-sistema-dgac',
            'Solicitud de base de datos',
            'Formulario para la creacion o acceso a bases de datos.',
            'docx',
            'usuario-sistema-dgac.docx',
            'forms/usuario-sistema-dgac.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Formularios'
        ),
        (
            'Formularios',
            'solicitud-carpeta-compartida',
            'Solicitud de carpeta compartida',
            'Solicitud para la habilitacion de acceso a carpeta compartida institucional.',
            'docx',
            'solicitud-carpeta-compartida.docx',
            'forms/solicitud-carpeta-compartida.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Formularios'
        ),
        (
            'Especificaciones',
            'computadora-escritorio',
            'Computadora de escritorio',
            'Especificaciones tecnicas para equipo de computo de escritorio institucional.',
            'pdf',
            'computadora-escritorio.pdf',
            'specs/computadora-escritorio.pdf',
            'application/pdf',
            'Equipo'
        ),
        (
            'Especificaciones',
            'computadora-portatil',
            'Computadora portatil',
            'Documento con requerimientos y caracteristicas para computadora portatil.',
            'pdf',
            'computadora-portatil.pdf',
            'specs/computadora-portatil.pdf',
            'application/pdf',
            'Movilidad'
        ),
        (
            'Especificaciones',
            'escaner',
            'Escaner',
            'Ficha de especificaciones para equipo de digitalizacion y escaneo institucional.',
            'pdf',
            'escaner.pdf',
            'specs/escaner.pdf',
            'application/pdf',
            'Periferico'
        ),
        (
            'Especificaciones',
            'ups',
            'UPS',
            'Especificaciones tecnicas para sistema de respaldo y proteccion electrica.',
            'pdf',
            'ups.pdf',
            'specs/ups.pdf',
            'application/pdf',
            'Energia'
        )
) AS x (
    category_name,
    code,
    title,
    description,
    document_type,
    file_name,
    file_path,
    mime_type,
    area
)
INNER JOIN document_categories dc
    ON dc.name = x.category_name
WHERE NOT EXISTS (
    SELECT 1
    FROM documents d
    WHERE d.code = x.code
);

-- Enlaces institucionales
INSERT INTO links (title, description, url, active)
VALUES
    (
        'Direccion General de Aeronautica Civil',
        'Portal institucional oficial de la DGAC.',
        'https://dgac.gob.gt/',
        TRUE
    ),
    (
        'Portal de tramites DGAC',
        'Acceso para gestionar y autenticar tramites institucionales.',
        'http://prueba_tramites.dgacgt.local/auth',
        TRUE
    ),
    (
        'Ministerio de Comunicaciones, Infraestructura y Vivienda',
        'Sitio oficial del ministerio para consultas, informacion y publicaciones.',
        'https://www.civ.gob.gt/web/guest/inicio',
        TRUE
    ),
    (
        'Direccion General de Aeronautica Civil',
        'Portal interno institucional oficial de la Direccion General de Aeronautica Civil.',
        'http://172.16.0.126/',
        TRUE
    ),
    (
        'Radio TGW en linea',
        'Acceso directo a la senal en linea de Radio TGW.',
        'https://radiotgw.gob.gt/radio-tgw-en-linea/',
        TRUE
    )
ON CONFLICT DO NOTHING;

-- Administrador inicial
INSERT INTO admin_users (username, password_hash, role, active)
VALUES
    (
        'admin',
        '$2b$12$Cugj4x8nwkqIVdmKMEJIce4TKOWbPCemz/kzJ/wVXWz91XCk63RLG',
        'admin',
        TRUE
    )
ON CONFLICT (username) DO NOTHING;

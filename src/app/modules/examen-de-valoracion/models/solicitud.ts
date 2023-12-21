export interface Solicitud {
    id?: number;
    fecha?: string;
    estado?: string;
    titulo?: string;
    doc_solicitud_valoracion?: File;
    doc_anteproyecto_examen?: File;
    doc_examen_valoracion?: File;
    docente?: string;
    experto?: string;
    numero_acta?: string;
    fecha_acta?: string;
    doc_oficio_jurados?: File;
    fecha_maxima_evaluacion?: string;
}

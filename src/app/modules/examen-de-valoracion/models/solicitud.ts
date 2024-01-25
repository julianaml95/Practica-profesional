import { Docente } from '../../gestion-docentes/models/docente';
import { Estudiante } from '../../gestion-estudiantes/models/estudiante';
import { Experto } from './experto';

export interface Solicitud {
    id?: number;
    fecha?: string;
    estado?: string;
    titulo?: string;
    doc_solicitud_valoracion?: string;
    doc_anteproyecto_examen?: string;
    doc_examen_valoracion?: string;
    estudiante?: Estudiante;
    docente?: Docente;
    experto?: Experto;
    numero_acta?: string;
    fecha_acta?: string;
    doc_oficio_jurados?: string;
    fecha_maxima_evaluacion?: string;
}

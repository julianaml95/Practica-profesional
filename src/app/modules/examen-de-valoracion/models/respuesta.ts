import { Docente } from '../../gestion-docentes/models/docente';
import { Experto } from './experto';
import { Solicitud } from './solicitud';

export interface Evaluacion {
    doc_formatoB?: string;
    doc_formatoC?: string;
    doc_observaciones?: string;
    estado_respuesta?: string;
}

export interface Respuesta {
    id?: number;
    titulo?: string;
    solicitud?: Solicitud;
    docente?: Docente;
    experto?: Experto;
    evaluaciones?: Evaluacion[];
    fecha_correcciones?: string;
}

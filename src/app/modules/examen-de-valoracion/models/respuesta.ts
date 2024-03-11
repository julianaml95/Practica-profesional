import { Docente } from '../../gestion-docentes/models/docente';
import { Experto } from './experto';
import { Solicitud } from './solicitud';

export interface Evaluacion {
    id?: number;
    docFormatoB?: string;
    docFormatoC?: string;
    docObservaciones?: string;
    estadoRespuesta?: string;
}

export interface Respuesta {
    id?: number;
    titulo?: string;
    solicitud?: Solicitud;
    docente?: Docente;
    experto?: Experto;
    fecha_correcciones?: string;
}

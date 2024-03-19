import { Docente } from '../../gestion-docentes/models/docente';
import { Experto } from './experto';
import { Solicitud } from './solicitud';

export interface Evaluacion {
    id?: number;
    docFormatoB?: string;
    docFormatoC?: string;
    experto?: number;
    docente?: number;
    docObservaciones?: string;
    estadoRespuesta?: string;
    fechaCorrecciones?: string;
}

export interface Respuesta {
    id?: number;
    titulo?: string;
    solicitud?: Solicitud;
    finalizado: boolean;
}

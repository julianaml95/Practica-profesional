import { Docente } from '../../gestion-docentes/models/docente';
import { Estudiante } from '../../gestion-estudiantes/models/estudiante';
import { Experto } from './experto';

export interface Solicitud {
    id?: number;
    fechaCreacion?: string;
    estado?: string;
    titulo?: string;
    linkFormatoA?: string;
    linkFormatoD?: string;
    linkFormatoE?: string;
    estudiante?: Estudiante;
    docente?: Docente;
    experto?: Experto;
    numero_acta?: string;
    fecha_acta?: string;
    linkOficioDirigidoEvaluadores?: string;
    fecha_maxima_evaluacion?: string;
}

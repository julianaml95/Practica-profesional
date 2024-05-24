import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backendGestionExpertos, backendGestionTrabajoDeGrado } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Experto } from 'src/app/modules/examen-de-valoracion/models/experto';

@Injectable({
    providedIn: 'root',
})
export class ExpertoService {
    constructor(private http: HttpClient) {}

    listExpertos(): Observable<any[]> {
        return this.http.get<Experto[]>(
            backendGestionTrabajoDeGrado(
                'solicitud_examen_valoracion/listarExpertos'
            ),
            {
                headers: getHeaders(),
            }
        );
    }

    getExperto(id: number) {
        return this.http.get<Experto>(
            backendGestionExpertos(`expertos/${id}`),
            { headers: getHeaders() }
        );
    }
}

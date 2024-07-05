import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backendGestionEgresados } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Curso } from '../models/curso';

@Injectable({
    providedIn: 'root',
})
export class CursoService {
    constructor(private http: HttpClient) {}

    getCurso(id: number) {
        return this.http.get<Curso>(backendGestionEgresados(`curso/${id}`), {
            headers: getHeaders(),
        });
    }

    addCurso(curso: Curso) {
        return this.http.post<any>(backendGestionEgresados('curso'), curso, {
            headers: getHeaders(),
        });
    }

    updateCurso(id: number, curso: Curso) {
        return this.http.put<any>(backendGestionEgresados(`curso/${id}`), curso, {
            headers: getHeaders(),
        });
    }

    deleteCurso(id: number) {
        return this.http.delete<any>(backendGestionEgresados(`curso/${id}`), {
            headers: getHeaders(),
        });
    }

    listCursos(estudianteId: number): Observable<Curso[]> {
        return this.http.get<Curso[]>(backendGestionEgresados(`curso/listarCursos/${estudianteId}`), {
            headers: getHeaders(),
        });
    }
}

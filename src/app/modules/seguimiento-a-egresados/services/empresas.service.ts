import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backend } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Empresa } from '../models/empresa';

@Injectable({
    providedIn: 'root',
})
export class EmpresaService {
    constructor(private http: HttpClient) {}

    getEmpresa(id: number) {
        return this.http.get<Empresa>(backend(`empresa/${id}`), {
            headers: getHeaders(),
        });
    }

    addEmpresa(empresa: Empresa) {
        return this.http.post<any>(backend('empresa'), empresa, {
            headers: getHeaders(),
        });
    }

    updateEmpresa(id: number, empresa: Empresa) {
        return this.http.put<any>(backend(`empresa/${id}`), empresa, {
            headers: getHeaders(),
        });
    }

    deleteEmpresa(id: number) {
        return this.http.delete<any>(backend(`empresa/${id}`), {
            headers: getHeaders(),
        });
    }

    listEmpresas(): Observable<Empresa[]> {
        return this.http.get<Empresa[]>(backend('empresa'), {
            headers: getHeaders(),
        });
    }
}

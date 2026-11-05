import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

interface Product { id: number; name: string; price: number; category: string; }

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p *ngIf="loading">Cargando…</p>
    <ul *ngIf="!loading">
      <li *ngFor="let p of products" [ngClass]="{ 'sold-out': p.price === 0 }">{{ p.name }} - {{ p.price }}</li>
    </ul>
  `,
})
export class ProductListComponent implements OnInit, OnDestroy {
  @Input() title = 'Productos';
  products: Product[] = [];
  loading = true;
  private sub?: Subscription;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.sub = this.http.get<{ data: Product[] }>('/api/products').subscribe((res) => {
      this.products = res.data;
      this.loading = false;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

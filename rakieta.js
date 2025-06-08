class RakietaSymulacja {
  constructor() {
    // Pola stanu
    this.maksymalnaPredkosc = 0;
    this.maksymalnePrzyspieszenie = 0;
    this.maksymalnaSilaWypadkowa = 0;
    this.rakietaZaladowana = false;
    this.klatkaAnimacji = null;
    this.ostatniCzas = null;
    this.animacjaZakonczona = false;
    // Elementy DOM
    this.przyciskStart = document.getElementById('launchBtn');
    this.wynik = document.getElementById('result');
    this.telemetria = document.getElementById('telemetry');
    this.sily = document.getElementById('forces');
    this.komunikat = document.getElementById('event');
    this.rakieta = document.getElementById('kontener-rakiety');
    this.etykietaSpadanie = document.getElementById('fallingLabel');
    this.wyborPlanety = document.getElementById('planet');
    this.ziemiaDiv = document.querySelector('.ziemia');
    this.scenaDiv = document.querySelector('.scena');
    this.etykietaKosmos = document.querySelector('.etykieta-kosmos');
    // Stałe
    this.mnoznikCzasu = 10;
    // Stan symulacji
    this.predkosc = 0;
    this.wysokosc = 0;
    this.czas = 0;
    this.przyspieszenie = 0;
    this.zredukowano = false;
    this.spada = false;
    this.pulsOgnia = 0;
    this.bazowaSkalaOgnia = 0.2;
    this.ogienPulsuje = false;
    // Parametry planety
    this.g = 9.81;
    this.wysokoscAtmo = 100000;
    this.wysokoscPolowa = 50000;
    // SVG ognia
    this.ogien = null;
  }

  inicjalizuj() {
    this.zaladujSVG();
    this.zaladujZiemie();
    this.scenaDiv.classList.add('scena-ziemia');
    this.ustawWygladPlanety(this.wyborPlanety.value);
    this.wyborPlanety.addEventListener('change', () => {
      this.ustawWygladPlanety(this.wyborPlanety.value);
    });
    document.getElementById('closeSummary').onclick = () => {
      document.getElementById('summaryModal').style.display = 'none';
    };
    this.przyciskStart.onclick = () => this.start();
  }

  zaladujSVG() {
    fetch('rocket.svg')
      .then(odpowiedz => odpowiedz.text())
      .then(svg => {
        this.rakieta.innerHTML = svg;
        this.rakietaZaladowana = true;
        this.ogien = this.rakieta.querySelector('#flame');
        if (this.ogien) this.ogien.style.opacity = '0';
        this.rakieta.style.bottom = '2%';
      });
  }

  zaladujZiemie() {
    fetch('earth.svg')
      .then(odpowiedz => odpowiedz.text())
      .then(svg => {
        this.ziemiaDiv.innerHTML = svg;
      });
  }

  ustawWygladPlanety(planeta) {
    this.scenaDiv.classList.remove('scena-ziemia', 'scena-mars');
    if (planeta === 'mars') {
      fetch('mars.svg').then(odpowiedz => odpowiedz.text()).then(svg => {
        this.ziemiaDiv.innerHTML = svg;
      });
      this.scenaDiv.classList.add('scena-mars');
      this.etykietaKosmos.textContent = 'KOSMOS (80 km+)';
      this.g = 3.71;
      this.wysokoscAtmo = 80000;
      this.wysokoscPolowa = 40000;
    } else {
      fetch('earth.svg').then(odpowiedz => odpowiedz.text()).then(svg => {
        this.ziemiaDiv.innerHTML = svg;
      });
      this.scenaDiv.classList.add('scena-ziemia');
      this.etykietaKosmos.textContent = 'KOSMOS (100 km+)';
      this.g = 9.81;
      this.wysokoscAtmo = 100000;
      this.wysokoscPolowa = 50000;
    }
    // Reset animacji i pozycji rakiety po zmianie planety
    if (this.klatkaAnimacji) cancelAnimationFrame(this.klatkaAnimacji);
    this.rakieta.style.bottom = '2%';
    this.rakieta.style.transform = 'translateX(-50%) rotate(0deg)';
    this.ogien = this.rakieta.querySelector('#flame');
    if (this.ogien) this.ogien.style.opacity = '0';
    this.wynik.textContent = '';
    this.telemetria.textContent = '';
    this.sily.textContent = '';
    this.komunikat.textContent = '';
    this.etykietaSpadanie.style.display = 'none';
  }

  start() {
    if (!this.rakietaZaladowana) {
      setTimeout(() => this.start(), 100);
      return;
    }
    if (this.klatkaAnimacji) cancelAnimationFrame(this.klatkaAnimacji);
    this.wynik.textContent = '';
    this.telemetria.textContent = '';
    this.sily.textContent = '';
    this.komunikat.textContent = '';
    this.etykietaSpadanie.style.display = 'none';
    this.rakieta.style.transform = 'translateX(-50%) rotate(0deg)';
    this.ogien = this.rakieta.querySelector('#flame');
    if (this.ogien) {
      this.ogien.setAttribute('transform', 'translate(950,2290) scale(1,0.2) translate(-950,-2290)');
      this.ogien.style.opacity = '1';
    }
    const masa = parseFloat(document.getElementById('mass').value);
    const silaCiagu = parseFloat(document.getElementById('thrust').value);
    // WALIDACJA DANYCH
    if (isNaN(masa) || isNaN(silaCiagu) || masa <= 0 || silaCiagu <= 0) {
      this.wynik.textContent = 'Podaj dodatnie wartości masy i siły ciągu (większe od zera)!';
      return;
    }
    // Reset stanu symulacji
    this.predkosc = 0;
    this.wysokosc = 0;
    this.czas = 0;
    this.przyspieszenie = silaCiagu / masa - this.g;
    this.zredukowano = false;
    this.spada = false;
    this.pulsOgnia = 0;
    this.bazowaSkalaOgnia = 0.2;
    this.ogienPulsuje = false;
    this.maksymalnaPredkosc = 0;
    this.maksymalnePrzyspieszenie = 0;
    this.maksymalnaSilaWypadkowa = 0;
    this.animacjaZakonczona = false;
    this.ostatniCzas = null;
    this.rakieta.style.bottom = '2%';
    this.klatkaAnimacji = requestAnimationFrame((t) => this.krok(t, masa, silaCiagu));
  }

  krok(teraz, masa, silaCiagu) {
    if (this.animacjaZakonczona) return;
    if (!this.ostatniCzas) this.ostatniCzas = teraz;
    let dt = ((teraz - this.ostatniCzas) / 1000) * this.mnoznikCzasu;
    this.ostatniCzas = teraz;
    // Zmiana mocy w połowie drogi
    if (!this.zredukowano && this.wysokosc >= this.wysokoscPolowa) {
      this.przyspieszenie = (silaCiagu / 2) / masa - this.g;
      this.zredukowano = true;
      this.komunikat.textContent = 'UWAGA: Ciąg silnika zmniejszony o połowę!';
      this.bazowaSkalaOgnia = 0.4;
      this.ogienPulsuje = false;
    }
    this.predkosc += this.przyspieszenie * dt;
    this.wysokosc += this.predkosc * dt;
    this.czas += dt;
    this.animujOgień();
    // Przechylenie i napis przy spadaniu
    if (!this.spada && this.predkosc < 0) {
      this.spada = true;
      this.rakieta.style.transform = 'translateX(-50%) rotate(25deg)';
      this.etykietaSpadanie.style.display = 'block';
    }
    // Przelicz wysokość na pozycję rakiety na ekranie
    let procent = 2 + (this.wysokosc / this.wysokoscAtmo) * 78;
    if (procent > 80) procent = 80;
    this.rakieta.style.bottom = procent + '%';
    this.wyswietlTelemetrie(masa);
    this.wyswietlSily(masa, silaCiagu);
    // Śledzenie wartości maksymalnych
    if (Math.abs(this.predkosc) > Math.abs(this.maksymalnaPredkosc)) this.maksymalnaPredkosc = this.predkosc;
    if (Math.abs(this.przyspieszenie) > Math.abs(this.maksymalnePrzyspieszenie)) this.maksymalnePrzyspieszenie = this.przyspieszenie;
    const sila = this.zredukowano ? silaCiagu / 2 : silaCiagu;
    const silaGrawitacji = masa * this.g;
    const silaWypadkowa = sila - silaGrawitacji;
    if (Math.abs(silaWypadkowa) > Math.abs(this.maksymalnaSilaWypadkowa)) this.maksymalnaSilaWypadkowa = silaWypadkowa;
    if (this.wysokosc >= this.wysokoscAtmo) {
      this.wynik.textContent = `Rakieta wydostała się poza atmosferę w czasie ${this.czas.toFixed(1)} s!`;
      this.komunikat.textContent = '';
      this.etykietaSpadanie.style.display = 'none';
      this.rakieta.style.transform = 'translateX(-50%) rotate(0deg)';
      if (this.ogien) {
        this.ogien.setAttribute('transform', 'translate(950,2290) scale(1,1) translate(-950,-2290)');
        this.ogien.style.opacity = '0';
      }
      this.animacjaZakonczona = true;
      this.pokazPodsumowanie();
      return;
    }
    if (this.wysokosc < 0 && this.czas > 0) {
      this.wynik.textContent = 'Rakieta nie wydostała się poza atmosferę i wróciła na Ziemię!';
      this.rakieta.style.bottom = '2%';
      this.komunikat.textContent = '';
      this.etykietaSpadanie.style.display = 'none';
      this.rakieta.style.transform = 'translateX(-50%) rotate(0deg)';
      if (this.ogien) {
        this.ogien.setAttribute('transform', 'translate(950,2290) scale(1,1) translate(-950,-2290)');
        this.ogien.style.opacity = '0';
      }
      this.animacjaZakonczona = true;
      this.pokazPodsumowanie();
      return;
    }
    this.klatkaAnimacji = requestAnimationFrame((t) => this.krok(t, masa, silaCiagu));
  }

  animujOgień() {
    if (!this.ogien) return;
    if (!this.spada) {
      let skalaY;
      if (!this.zredukowano) {
        if (this.wysokosc < 5000) {
          this.bazowaSkalaOgnia = 0.2 + (1.0 - 0.2) * (this.wysokosc / 5000);
          skalaY = this.bazowaSkalaOgnia;
        } else {
          this.ogienPulsuje = true;
          this.pulsOgnia += 0.15;
          this.bazowaSkalaOgnia += (1.0 - this.bazowaSkalaOgnia) * 0.08;
          skalaY = this.bazowaSkalaOgnia + 0.08 * Math.sin(this.pulsOgnia * 2);
        }
      } else {
        this.pulsOgnia += 0.12;
        skalaY = 0.5 + 0.04 * Math.sin(this.pulsOgnia * 2);
      }
      this.ogien.setAttribute('transform', `translate(950,1786.22) scale(1,${skalaY}) translate(-950,-1786.22)`);
      this.ogien.style.opacity = '1';
    } else {
      this.ogien.style.opacity = '0';
    }
  }

  wyswietlTelemetrie(masa) {
    this.telemetria.innerHTML = `
      <div class="linia-danych">Czas: <b>${this.czas.toFixed(1)}</b> <span class="jednostka">s</span></div>
      <div class="linia-danych">Wysokość: <b>${this.wysokosc.toFixed(0)}</b> <span class="jednostka">m</span></div>
      <div class="linia-danych">Prędkość: <b>${this.predkosc.toFixed(1)}</b> <span class="jednostka">m/s</span></div>
      <div class="linia-danych">Przyspieszenie: <b>${this.przyspieszenie.toFixed(2)}</b> <span class="jednostka">m/s<sup>2</sup></span></div>
      <div class="linia-danych">g = ${this.g.toFixed(2)} <span class="jednostka">m/s<sup>2</sup></span></div>
    `;
  }

  wyswietlSily(masa, silaCiagu) {
    const sila = this.zredukowano ? silaCiagu / 2 : silaCiagu;
    const silaGrawitacji = masa * this.g;
    const silaWypadkowa = sila - silaGrawitacji;
    this.sily.innerHTML = `
      <div class="linia-danych">Siła ciągu: <b>F = ${sila.toFixed(0)}</b> <span class="jednostka">N</span></div>
      <div class="linia-danych">Siła grawitacji: <b>Fg = m·g = ${silaGrawitacji.toFixed(0)}</b> <span class="jednostka">N</span></div>
      <div class="linia-danych">Siła wypadkowa: <b>Fw = F - Fg = ${silaWypadkowa.toFixed(0)}</b> <span class="jednostka">N</span></div>
    `;
  }

  pokazPodsumowanie() {
    const modal = document.getElementById('summaryModal');
    const content = document.getElementById('summaryContent');
    content.innerHTML = `
      <div><b>Maksymalna prędkość:</b> ${this.maksymalnaPredkosc.toFixed(2)} <span class="jednostka">m/s</span></div>
      <div><b>Maksymalne przyspieszenie:</b> ${this.maksymalnePrzyspieszenie.toFixed(2)} <span class="jednostka">m/s<sup>2</sup></span></div>
      <div><b>Maksymalna siła wypadkowa:</b> ${this.maksymalnaSilaWypadkowa.toFixed(0)} <span class="jednostka">N</span></div>
    `;
    modal.style.display = 'flex';
  }
}

// Inicjalizacja symulacji po załadowaniu DOM
window.addEventListener('DOMContentLoaded', () => {
  const symulacja = new RakietaSymulacja();
  symulacja.inicjalizuj();
}); 
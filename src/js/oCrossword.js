/**
 * Initialises an o-crossword components inside the element passed as the first parameter
 *
 * @param {(HTMLElement|string)} [el=document.body] - Element where to search for the o-crossword component. You can pass an HTMLElement or a selector string
 * @returns {OCrossword} - A single OCrossword instance
 */

'use strict';

const Hammer = require('hammerjs');
const HORIZ_PAN_SCALE = 1.3;
const HORIZ_PAN_SPRING = 0.2;

function buildGrid(
	rootEl,
{
	size,
	gridnums,
	grid,
	clues
}) {
	const tableEl = rootEl.querySelector('table');
	const cluesEl = rootEl.querySelector('ul.o-crossword-clues');
	const {cols, rows} = size;
	let count = 0;
	for (let i=0; i<rows; i++) {
		const tr = document.createElement('tr');
		for (let j=0; j<cols; j++) {
			const td = document.createElement('td');
			tr.appendChild(td);
			if (gridnums[count]) {
				const label = document.createElement('span');
				label.classList.add('o-crossword-gridnum');
				label.textContent = gridnums[count];
				td.appendChild(label);
			}
			if (grid[count] === '.') {
				td.classList.add('empty');
			}
			count++;
		}
		tableEl.appendChild(tr);
	}

	if (clues) {
		const acrossEl = document.createElement('ul');
		acrossEl.classList.add('o-crossword-clues-across');

		const downEl = document.createElement('ul');
		downEl.classList.add('o-crossword-clues-down');

		const acrossWrapper = document.createElement('li');
		const downWrapper = document.createElement('li');

		acrossWrapper.appendChild(acrossEl);
		cluesEl.appendChild(acrossWrapper);

		downWrapper.appendChild(downEl);
		cluesEl.appendChild(downWrapper);

		for (const across of clues.across) {
			const tempLi = document.createElement('li');
			const tempSpan = document.createElement('span');
			tempSpan.textContent = across;
			acrossEl.appendChild(tempLi);
			tempLi.appendChild(tempSpan);
		}
		for (const down of clues.down) {
			const tempLi = document.createElement('li');
			const tempSpan = document.createElement('span');
			tempSpan.textContent = down;
			downEl.appendChild(tempLi);
			tempLi.appendChild(tempSpan);
		}
	}
}

'use strict';
function OCrossword(rootEl) {
	if (!rootEl) {
		rootEl = document.body;
	} else if (!(rootEl instanceof HTMLElement)) {
		rootEl = document.querySelector(rootEl);
	}
	if (rootEl.getAttribute('data-o-component') === 'o-crossword') {
		this.rootEl = rootEl;
	} else {
		this.rootEl = rootEl.querySelector('[data-o-component~="o-crossword"]');
	}

	if (this.rootEl !== undefined) {
		if (this.rootEl.dataset.oCrosswordData) {
			return fetch(this.rootEl.dataset.oCrosswordData)
			.then(res => res.json())
			.then(json => buildGrid(rootEl, json))
			.then(() => this.assemble());
		} else {
			this.assemble();
		}
	}
}

OCrossword.prototype.assemble = function assemble() {
	const tableEl = this.rootEl.querySelector('table');
	const cluesEl = this.rootEl.querySelector('ul.o-crossword-clues');
	if (cluesEl) {
		const cluesUlEls = Array.from(cluesEl.querySelectorAll('ul'));
		const wrapper = document.createElement('div');
		wrapper.classList.add('o-crossword-clues-wrapper');
		const previewEl = cluesEl.cloneNode(true);
		previewEl.classList.add('preview');

		this.rootEl.insertBefore(wrapper, cluesEl);
		wrapper.appendChild(previewEl);
		wrapper.appendChild(cluesEl);

		// TODO: DEBOUNCE!!!
		const onResize = (function onResize() {
			cluesEl.classList.remove('magnify');
			this.rootEl.classList.remove('collapsable-clues');
			cluesEl.style.opacity = '0';
			const height1 = cluesEl.clientHeight;
			const width1 = cluesEl.clientWidth;
			const height2 = tableEl.clientHeight;
			this._cluesElHeight = height1;
			let scale = height2/height1;
			if (scale > 0.2) scale = 0.2;
			this._height = height1 * scale;
			cluesEl.style.marginLeft = tableEl.style.marginLeft = `${width1 * scale}px`;
			this._cluesPanHorizTarget = this._cluesPanHoriz = this._cluesPanHorizStart = -(width1 + width1 * scale + 20);
			previewEl.style.marginBottom = `${-height1 * (1-scale)}px`;
			previewEl.style.transform = `scale(${scale})`;
			wrapper.style.height = tableEl.height;
			this.rootEl.classList.add('collapsable-clues');
			if (cluesEl.className.indexOf('magnify') === -1) cluesEl.classList.add('magnify');
			cluesEl.style.opacity = '';
		}).bind(this);

		this.onResize = onResize;

		this._raf = requestAnimationFrame(function animate() {
			if (cluesEl.className.indexOf('expanded') !== -1 && !this._isGrabbed) {
				this._cluesPanHoriz = this._cluesPanHoriz + (this._cluesPanHorizTarget - this._cluesPanHoriz) * HORIZ_PAN_SPRING;
				cluesEl.style.transform = `translateX(${this._cluesPanHoriz}px)`;
			}
			this._raf = requestAnimationFrame(animate.bind(this));
		}.bind(this));

		this.hammerMC = new Hammer.Manager(this.rootEl, {
			recognizers: [
				[Hammer.Pan, { direction: Hammer.DIRECTION_ALL }],
				[Hammer.Press, { time: 150 }],
				[Hammer.Swipe, { direction: Hammer.DIRECTION_ALL }]
			]
		});

		const onPanVert = function onPanVert(e) {
			if (e.isFirst || (e.type.indexOf('start') !== -1 && (e.additionalEvent === 'panup' || e.additionalEvent === 'pandown'))){
				if (e.center.x < Number(tableEl.style.marginLeft.match(/([0-9.]+)px/)[1])) {
					if (cluesEl.className.indexOf('magnify-drag') === -1) cluesEl.classList.add('magnify-drag');
				}
			}
			if (cluesEl.className.indexOf('magnify-drag') !== -1) {

				if (cluesEl.className.indexOf('magnify') === -1) cluesEl.classList.add('magnify');
				if (cluesEl.className.indexOf('expanded') !== -1) cluesEl.classList.remove('expanded');
				if (cluesEl.scrollTop) cluesEl.scrollTop = 0;
				this._isGrabbed = true;

				e.preventDefault();
				const proportion = (e.center.y/this._height) - 0.05;
				const offset = this._cluesElHeight * proportion;

				for (const li of cluesUlEls) {
					li.style.transform = `translateY(${-offset}px)`;
				}

				cluesEl.style.transform = `translateY(${e.center.y}px)`;
			}
		}.bind(this);

		const onPanHoriz = function onPanHoriz(e) {
			if (Math.abs(e.deltaX) > 20) {
				this._isGrabbed = true;
				e.preventDefault();
				if (cluesEl.className.indexOf('magnify-drag') !== -1) cluesEl.classList.remove('magnify-drag');
				if (cluesEl.className.indexOf('magnify') !== -1) cluesEl.classList.remove('magnify');
				if (cluesEl.className.indexOf('expanded') === -1) cluesEl.classList.add('expanded');
				cluesEl.style.transform = `translateX(${this._cluesPanHoriz + e.deltaX * HORIZ_PAN_SCALE}px)`;
				for (const li of cluesUlEls) {
					li.style.transform = '';
				}
			}
		}.bind(this);

		const onPanEnd = function onPanEnd(e) {
			if ( this._isGrabbed && cluesEl.className.indexOf('expanded') !== -1 ) {
				this._cluesPanHoriz = e.deltaX * HORIZ_PAN_SCALE + this._cluesPanHoriz;
				this._isGrabbed = false;
				if (this._cluesPanHoriz > 0) {
					this._cluesPanHorizTarget = 0;
				} else {
					this._cluesPanHorizTarget = this._cluesPanHorizStart;
				}
			} else if (
				this._isGrabbed && cluesEl.className.indexOf('magnify') !== -1
			) {
				this._isGrabbed = false;
				cluesEl.classList.remove('magnify-drag');
				cluesEl.classList.add('magnify');
				cluesEl.classList.remove('expanded');
			}
		}.bind(this);

		this.hammerMC.on('panup pandown swipeup swipedown panstart press', onPanVert);
		this.hammerMC.on('panleft panright', onPanHoriz);
		this.hammerMC.on('panend pressup pancancel', onPanEnd);

		this.addEventListener(this.rootEl, 'click', onPanEnd);

		onResize.bind(this)();
		this.addEventListener(window, 'resize', onResize);
	}
};

OCrossword.prototype.addEventListener = function(el, type, callback) {
	if (this.listeners === undefined) this.listeners = [];
	this.listeners.push({el, type, callback});
	el.addEventListener(type, callback);
};

OCrossword.prototype.removeAllEventListeners = function() {
	this.listeners.forEach(function remove({el, type, callback}) {
		el.removeEventListener(type, callback);
	});
};

module.exports = OCrossword;

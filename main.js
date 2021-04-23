import OCrossword from './src/js/oCrossword.js';

const constructAll = function() {
	if (OCrossword.disableAutoInit) {
		return;
	}
	[].slice.call(document.querySelectorAll('[data-o-component~="o-crossword"]')).forEach(function (el) {
		new OCrossword(el);
	});

	document.removeEventListener('o.DOMContentLoaded', constructAll);
};
document.addEventListener('o.DOMContentLoaded', constructAll);
document.addEventListener('o.CrosswordDataUpdated', constructAll);

export default OCrossword;

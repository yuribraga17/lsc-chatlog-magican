$(document).ready(function() {
    let applyBackground = false;
    let applyCensorship = false;
    let censorshipStyle = 'pixelated';
    let characterName = "";
    const $textarea = $("#chatlogInput");
    const $output = $("#output");
    const $toggleBackgroundBtn = $("#toggleBackground");
    const $toggleCensorshipBtn = $("#toggleCensorship");
    const $toggleCensorshipStyleBtn = $("#toggleCensorshipStyle");

    $toggleBackgroundBtn.click(toggleBackground);
    $toggleCensorshipBtn.click(toggleCensorship);
    $toggleCensorshipStyleBtn.click(toggleCensorshipStyle);

    $("#lineLengthInput").on("input", processOutput);

    $("#characterNameInput").on("input", debounce(applyFilter, 300));

    function toggleBackground() {
        applyBackground = !applyBackground;
        $output.toggleClass("background-active", applyBackground);

        $toggleBackgroundBtn
            .toggleClass("btn-dark", applyBackground)
            .toggleClass("btn-outline-dark", !applyBackground);

        processOutput();
    }

    function toggleCensorship() {
        applyCensorship = !applyCensorship;
        $toggleCensorshipBtn
            .toggleClass("btn-dark", applyCensorship)
            .toggleClass("btn-outline-dark", !applyCensorship);
        processOutput();
    }

    function toggleCensorshipStyle() {
        censorshipStyle = (censorshipStyle === 'pixelated') ? 'hidden' : 'pixelated';
        console.log(`Estilo de censura alterado para: ${censorshipStyle}`);
        
        // Alterar o texto do botão
        $toggleCensorshipStyleBtn.text(`Estilo censura: ${censorshipStyle.charAt(0).toUpperCase() + censorshipStyle.slice(1)}`);
        
        // Chama o processo de formatação sem passar pelo filtro de personagem ainda
        processOutput();
    }
    
    // Aplique a filtragem de personagem após a definição do estilo de censura
    function applyFilter() {
        characterName = $("#characterNameInput").val().toLowerCase();
        processOutput();
    }
    

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function throttle(func, limit) {
        let lastFunc, lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if (Date.now() - lastRan >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    $textarea.off("input").on("input", throttle(processOutput, 200));

    function replaceDashes(text) {
        return text.replace(/(\.{2,3}-|-\.{2,3})/g, '—');
    }

    function processOutput() {
        const chatText = $textarea.val();
        const chatLines = chatText.split("\n")
                                  .map(removeTimestamps)
                                  .map(replaceDashes);
        let fragment = document.createDocumentFragment();

        chatLines.forEach((line) => {
            const div = document.createElement("div");
            div.className = "generated";

            let formattedLine = formatLineWithFilter(line);

            // Apply user-based censorship
            formattedLine = applyUserCensorship(formattedLine);

            // Color [!] after all other formatting
            if (line.includes("[!]")) {
                formattedLine = formattedLine.replace(/\[!\]/g, '<span class="toyou">[!]</span>');
            }

            div.innerHTML = addLineBreaksAndHandleSpans(formattedLine);
            fragment.appendChild(div);

            const clearDiv = document.createElement("div");
            clearDiv.className = "clear";
            fragment.appendChild(clearDiv);
        });

        $output.html('');
        $output.append(fragment);
        cleanUp();
    }

    function applyUserCensorship(line) {
        return line.replace(/÷(.*?)÷/g, (match, p1) => `<span class="${censorshipStyle}">${p1}</span>`);
    }

    function removeTimestamps(line) {
        return line.replace(/\[\d{2}:\d{2}:\d{2}\] /g, "").trim();
    }

    function formatLineWithFilter(line) {
        // Check for car whispers first
        if (line.startsWith("(Carro)")) {
            return wrapSpan("yellow", line);
        }

        const lowerLine = line.toLowerCase();
        const toSectionPattern = /\(to [^)]+\)/i;
        const lineWithoutToSection = line.replace(toSectionPattern, "");

        if (isRadioLine(line)) {
            if (!characterName) {
                return wrapSpan("radioColor", line);
            }
            return lineWithoutToSection.toLowerCase().includes(characterName) ?
                wrapSpan("radioColor", line) :
                wrapSpan("radioColor2", line);
        }

        if (lowerLine.includes("diz [baixa]")) {
            if (!characterName) {
                return wrapSpan("darkgrey", line);
            }
            return lineWithoutToSection.toLowerCase().includes(characterName) ?
                wrapSpan("grey", line) :
                wrapSpan("darkgrey", line);
        }

        if (lowerLine.includes("diz [baixo]")) {
            if (!characterName) {
                return wrapSpan("grey", line);
            }
            return lineWithoutToSection.toLowerCase().includes(characterName) ?
                wrapSpan("lightgrey", line) :
                wrapSpan("grey", line);
        }

        if (lowerLine.includes("diz:") || lowerLine.includes("shouts:")) {
            if (!characterName) {
                return wrapSpan("white", line);
            }
            return lineWithoutToSection.toLowerCase().includes(characterName) ?
                wrapSpan("white", line) :
                wrapSpan("lightgrey", line);
        }

        if (lowerLine.startsWith("you were frisked by")) {
            return wrapSpan("green", line);
        }

        // Description styling
        if (line.match(/^___Description of .+___$/)) {
            return wrapSpan("blue", line);
        }

        if (line.startsWith("Faixa etária:")) {
            const parts = line.split("Faixa etária:");
            return wrapSpan("blue", "Faixa etária:") + wrapSpan("white", parts[1]);
        }

        if (line.startsWith("->")) {
            const parts = line.split("->");
            return wrapSpan("blue", "->") + wrapSpan("white", parts[1]);
        }

        if (line.startsWith("[INFO]")) {
            const parts = line.split("[INFO]");
            return wrapSpan("blue", "[INFO]") + wrapSpan("white", parts[1]);
        }

        if (line.match(/^___Descrição de .+___$/)) {
            return wrapSpan("blue", line);
        }

        // [CASHTAP] messages
        if (line.startsWith("[CASHTAP]")) {
            const parts = line.split("[CASHTAP]");
            return wrapSpan("green", "[CASHTAP]") + wrapSpan("white", parts[1]);
        }

        if (line.match(/\|------ .+'s Items \d{2}\/[A-Z]{3}\/\d{4} - \d{2}:\d{2}:\d{2} ------\|/)) {
            return wrapSpan("green", line);
        }

        if (line.match(/^(?:\[\d{2}:\d{2}:\d{2}\]\s+)?\d+: .+/)) {
            // Skip phone number items, let formatLine handle them
            if (line.includes("PH:")) {
                return formatLine(line);
            }
            return wrapSpan("yellow", line);
        }

        if (lowerLine.startsWith("Peso total:")) {
            return wrapSpan("yellow", line);
        }

        if (lowerLine.startsWith("dinheiro disponível:")) {
            return wrapSpan("green", line);
        }

        if (/Você tem \d+ .+? preso na prisão\./.test(line)) {
            return formatJailTime(line);
        }
        
        if (/\[Laboratório de Drogas\](.*)/.test(line)) {
            return formatDrugLab(line);
        }

        const corpseDamagePattern = /^(.+?) \((ID)\) danos:/;
        const corpseDamageMatch = line.match(corpseDamagePattern);
        if (corpseDamageMatch) {
            const namePart = corpseDamageMatch[1];
            const restOfLine = line.slice(namePart.length);
            return `<span class="blue">${namePart}</span><span class="white">${restOfLine}</span>`;
        }

        const youBeenShotPattern = /Você foi baleado no (.+?) com uma (.+?) causando (\d+) de dano\. \(\(Saúde: (\d+)\)\)/;

        const youBeenShotMatch = line.match(youBeenShotPattern);
        if (youBeenShotMatch) {
            const [_, parteDoCorpo, arma, dano, saude] = youBeenShotMatch;
            return `<span class="death">Você foi baleado </span><span class="white">no </span><span class="death">${parteDoCorpo}</span><span class="white"> com uma </span><span class="death">${arma}</span><span class="white"> causando </span><span class="death">${dano}</span><span class="white"> de dano. ((Saúde: </span><span class="death">${saude}</span><span class="white">))</span>`;
        }        

        if (line === "********** CHAMADA DE EMERGÊNCIA **********") {
            return '<span class="blue">' + line + '</span>';
        }

        const emergencyCallPattern = /^(Número do log|Número de telefone|Localização|Situação):\s*(.*)$/;

        const match = line.match(emergencyCallPattern);

        if (match) {
            const key = match[1];
            const value = match[2];
            return '<span class="blue">' + key + ': </span><span class="white">' + value + '</span>';
        }
        if (/^\*\* \[PRISON PA\].*\*\*$/.test(line)) {
            return formatPrisonPA(line);
        }
        if (/\([^\)]+\) Mensagem de [^:]+: .+/.test(line)) {
            return formatSmsMessage(line);
        }
        if (lowerLine.includes("você definiu seu telefone principal para")) return formatPhoneSet(line);

        if (/Ligação de #\d+\. Use \/[\w]+ ou \/[\w]+\./.test(line)) {
            return formatIncomingCall(line);
        }
        
        if (lowerLine === 'Sua ligação foi atendida.') {
            return wrapSpan('yellow', line);
        }
        if (lowerLine === 'Você pendurou a ligação.') {
            return wrapSpan('white', line);
        }
        if (lowerLine === 'a outra parte recusou a chamada.') {
            return wrapSpan('white', line);
        }
        if (lowerLine.startsWith("[info]")) return colorInfoLine(line);
        if (lowerLine.includes("[ch: vts - vessel traffic service]")) return formatVesselTraffic(line);
        if (/\[[^\]]+ -> [^\]]+\]/.test(line)) return wrapSpan("depColor", line);
        if (line.startsWith("*")) return wrapSpan("me", line);
        if (line.startsWith(">")) return wrapSpan("ame", line);
        if (lowerLine.includes("(phone) *")) return wrapSpan("me", line);
        if (lowerLine.includes("whispers") || line.startsWith("(Carro)")) {
            return handleWhispers(line);
        }        
        if (lowerLine.includes("diz (celular):")) return handleCellphone(line);
        if (/\[[^\]]+ -> [^\]]+\]/.test(line)) return wrapSpan("depColor", line);
        if (lowerLine.includes("[megafone]:")) return wrapSpan("yellow", line);
        if (lowerLine.startsWith("info:")) {
            if (line.includes("leitor de cartão") || line.includes("Pagamento do cartão") || line.includes("deslizou seu cartão")) {
                return formatCardReader(line);
            }
            return formatInfo(line);
        }
        if (lowerLine.includes("Você recebeu $")) return colorMoneyLine(line);
        if (lowerLine.includes("[LABORATÓRIO DE DROGAS]")) {
            return '<span class="orange">[LABORATÓRIO DE DROGAS]</span> <span class="white">A produção foi iniciada.</span>';
        }
        if (lowerLine.includes("[character kill]")) return formatCharacterKill(line);
        if (/\[.*? intercom\]/i.test(lowerLine)) return formatIntercom(line);
        if (lowerLine.startsWith("você colocou")) return wrapSpan("orange", line);
        if (lowerLine.includes("da propriedade")) return wrapSpan("death", line);
        if (lowerLine.startsWith("você caiu")) return wrapSpan("death", line);
        if (lowerLine.startsWith("Use /PhoneCursor")) return formatPhoneCursor(line);
        if (lowerLine.includes("mostrou a você deles")) return formatShown(line);
        if (
            lowerLine.includes("Você enviou com sucesso sua localização atual")
        )
            return wrapSpan("green", line);
        if (lowerLine.includes("Você recebeu um local de"))
            return colorLocationLine(line);
        if (
            lowerLine.includes("você deu") ||
            lowerLine.includes("pagou a você") ||
            lowerLine.includes("você pagou") ||
            lowerLine.includes("você recebeu")
        )
            return handleTransaction(line);
            if (lowerLine.includes("Você agora está mascarado")) {
                return wrapSpan("green", line);
            }
        if (lowerLine.includes("Você mostrou seu inventário")) return wrapSpan("green", line);
        if (lowerLine.includes("você não está mais mascarado")) return wrapSpan("death", line);
        if (lowerLine.includes("você está sendo roubado, use /arob")) return formatRobbery(line);


        if (line.includes("Você recebeu uma localização de")) {
            return colorLocationLine(line);
        }

        if (line.includes("Você agora está mascarado")) {
            return wrapSpan("green", line);
        }
        
        
        // Faction messages
        if (line.includes("Você recebeu um convite para se juntar ao")) {
            const parts = line.split("junte-se ao ");
            const factionPart = parts[1].split(",")[0];
            return parts[0] + "junte -se ao " + wrapSpan("yellow", factionPart) + ", /ac para confirmar";
        }
        
        if (line.includes("Agora você é membro de")) {
            const parts = line.split("membro de ");
            const factionPart = parts[1].split(" você")[0];
            return parts[0] + "membro de " + wrapSpan("yellow", factionPart) + " you may need to /switchfactions to set it as your active faction!";
        }

        if (lowerLine.startsWith("você cortou")) return formatDrugCut(line);

        if (/\[ROUBO DE PROPRIEDADE\](.*?) \$[\d,]+.*$/.test(line)) {
            return formatPropertyRobbery(line);
        }

        if (/Você acabou de usar +?! Você sentirá os efeitos da droga em breve\./.test(line)) {
            return formatDrugEffect(line);
        }
        if (line.includes("[CASHTAP]")) {
            return formatCashTap(line);
        }
        if (
            lowerLine.includes("(bens)") ||
            lowerLine.match(/(.+?)\s+x(\d+)\s+\((\d+g)\)/)
        )
            return handleGoods(line);
        return formatLine(line);
    }

    function isRadioLine(line) {
        return /\[S: \d+ \| CH: .+\]/.test(line);
    }

    function formatLine(line) {
        const lowerLine = line.toLowerCase();

        if (line.includes("Armas equipadas")) {
            return wrapSpan("green", line);
        }

        if (lowerLine.startsWith("você usou")) {
            return wrapSpan("green", line);
        }

        if (lowerLine.includes("foi apreendido por")) {
            return wrapSpan("death", line);
        }

        if (lowerLine.startsWith("Você foi revistado por")) {
            return wrapSpan("green", line);
        }

        // Inventory header pattern
        if (line.match(/\|------ .+'s Unid \d{2}\/[A-Z]{3}\/\d{4} - \d{2}:\d{2}:\d{2} ------\|/)) {
            return wrapSpan("green", line);
        }

        // Equipped weapons header pattern
        if (line.match(/\|------ .+'s Armas equipadas ------\|/)) {
            return wrapSpan("green", line);
        }

        // Inventory item with phone number
        const phoneMatch = line.trim().match(/^(\d+: .+? x\d+ \(.+?\) -) (PH: \d+)$/);
        if (phoneMatch) {
            const [_, itemPart, phonePart] = phoneMatch;
            return wrapSpan("yellow", itemPart) + " " + wrapSpan("green", phonePart);
        }

        // Regular inventory item (with or without timestamp)
        if (line.match(/^(?:\[\d{2}:\d{2}:\d{2}\]\s+)?\d+: .+/)) {
            return wrapSpan("yellow", line);
        }

        // Total weight line
        if (lowerLine.startsWith("Peso total:")) {
            return wrapSpan("yellow", line);
        }

        if (lowerLine.startsWith("dinheiro disponível:")) {
            return wrapSpan("green", line);
        }

        if (/Você tem \d+ .+? preso na prisão\./.test(line)) {
            return formatJailTime(line);
        }
        

        return replaceColorCodes(line);
    }

    function formatDrugLab(line) {
        // Verifica se a linha contém "[Laboratório de Drogas]"
        if (line.includes("[Laboratório de Drogas]")) {
            return line.replace(
                /\[Laboratório de Drogas\](.*)/,
                '<span class="orange">[LABORATÓRIO DE DROGAS]</span><span class="white">$1</span>'
            );
        }
        return line; // Retorna o texto original caso não atenda ao padrão
    }
    
    
    function formatPropertyRobbery(line) {
        // Verifica se a linha contém o texto "[ROUBO DE PROPRIEDADE]"
        if (line.includes("[ROUBO DE PROPRIEDADE]")) {
            return line.replace(
                /\[ROUBO DE PROPRIEDADE\](.*?) (\$[\d,]+)(.*)/,
                '<span class="green">[ROUBO DE PROPRIEDADE]</span><span class="white">$1 </span><span class="green">$2</span><span class="white">$3</span>'
            );
        }
        return line; // Retorna o texto original caso não atenda ao padrão
    }
    
    function formatIncomingCall(line) {
        // Remove quaisquer colchetes
        line = line.replace(/[\[\]]/g, '');
    
        // Extrai os detalhes da chamada
        const match = line.match(/Ligação de #(\d+)\. Use (\/\w+) ou (\/\w+)\./);
        if (match) {
            const caller = match[1];
            const pickupCommand = match[2];
            const hangupCommand = match[3];
    
            return `<span class="yellow">Ligação de #${caller}</span><span class="white">. Use </span><span class="blue">${pickupCommand}</span><span class="white"> ou </span><span class="blue">${hangupCommand}</span><span class="white">.</span>`;
        }
        return line; // Retorna a linha original se a condição não for atendida
    }
    
    function formatJailTime(line) {
        const pattern = /(Você tem) (\d+ .+?) (preso na prisão\.)/;
        const match = line.match(pattern);
        if (match) {
            return `<span class="white">${match[1]} </span><span class="green">${match[2]}</span><span class="white"> ${match[3]}</span>`;
        }
        return line; // Retorna a linha original se a condição não for atendida
    }
      
    
    function wrapSpan(className, content) {
        return `<span class="${className}">${content}</span>`;
    }

    function handleWhispers(line) {
        if (line.startsWith("(Carro)")) {
            return wrapSpan("yellow", line);
        }
    
        const groupWhisperPattern = /^[A-Z][a-z]+\s[A-Z][a-z]+\ssussurra para \d+\spessoas/i;
        const match = line.match(groupWhisperPattern);
        if (match) {
            const splitIndex = match.index + match[0].length;
            return `<span class="orange">${line.slice(0, splitIndex)}</span><span class="whisper">${line.slice(splitIndex)}</span>`;
        }
    
        return wrapSpan("whisper", line);
    }    

    function handleCellphone(line) {
        return line.startsWith("!") ?
            wrapSpan('yellow', line.slice(1)) :
            wrapSpan("white", line);
    }

    function handleGoods(line) {
        return wrapSpan(
            "yellow",
            line.replace(/(\$\d+)/, '<span class="green">$1</span>')
        );
    }

    function handleTransaction(line) {
        return (
            '<span class="green">' +
            line.replace(/(\$\d+(?:,\d{3})*(?:\.\d{1,3})?)/g, '<span class="green">$1</span>') +
            "</span>"
        );
    }

    function formatInfo(line) {
        const moneyMatch = line.match(/\$(\d+)/);
        const itemMatch = line.match(/took\s(.+?)\s\((\d+)\)\sfrom\s(the\s.+)\.$/i);

        if (moneyMatch) {
            const objectMatch = line.match(/de (.+)\.$/i);
            return objectMatch ?
                `<span class="orange">Info:</span> <span class="white">Você levou</span> <span class="green">$${moneyMatch[1]}</span> <span class="white"> de ${objectMatch[1]}</span>.` :
                line;
        }

        if (itemMatch) {
            const itemName = itemMatch[1];
            const itemQuantity = itemMatch[2];
            const fromObject = itemMatch[3];

            return `<span class="orange">Info:</span> <span class="white">Você levou</span> <span class="white">${itemName}</span> <span class="white">(${itemQuantity})</span> <span class="white">de ${fromObject}</span>.`;
        }

        return line;
    }

    function formatSmsMessage(line) {
        // Remove any square brackets
        line = line.replace(/[\[\]]/g, '');
        // Wrap the entire line in yellow
        return wrapSpan('yellow', line);
    }

    function formatPhoneSet(line) {
        // Remove any square brackets except for [INFO]
        line = line.replace(/\[(?!INFO\])|\](?!)/g, '');
        // Replace [INFO] with green
        line = line.replace('[INFO]', '<span class="green">[INFO]</span>');
        // The rest is white
        const infoTag = '<span class="green">[INFO]</span>';
        const restOfLine = line.replace(/\[INFO\]/, '').trim();
        return infoTag + ' <span class="white">' + restOfLine + '</span>';
    }

    function colorInfoLine(line) {
        const datePattern = /\[INFO\]:\s*\[\d{2}\/[A-Z]{3}\/\d{4}\]\s.+/;
        if (datePattern.test(line)) {
            return applyDatePattern(line);
        }

        line = line.replace(/\[(?!INFO\])|\](?!)/g, '');
        line = line.replace('[INFO]', '<span class="green">[INFO]</span>');

        if (line.includes('Você recebeu um contato')) {
            if (line.includes('/aceitarnumero')) {
                return applyPhoneRequestFormatting(line);
            } else if (line.includes('/aceitarnumero')) {
                return applyContactShareFormatting(line);
            }
        } else if (line.includes('Você compartilhou seu número com')) {
            return applyNumberShareFormatting(line);
        } else if (line.includes('Você compartilhou')) {
            return applyContactSharedFormatting(line);
        } else {
            return '<span class="white">' + line + '</span>';
        }
    }

    function applyDatePattern(line) {
        return line.replace(
            /\[INFO\]:\s*(\[\d{2}\/[A-Z]{3}\/\d{4}\])\s(.+)/,
            '<span class="blue">[INFO]:</span> <span class="orange">$1</span> <span class="white">$2</span>'
        );
    }

    function applyPhoneRequestFormatting(line) {
        const pattern = /\[INFO\] Você recebeu um contato \((.+), ([^\)]+)\) from (.+)\. Use (\/aceitarnumero) para aceitá-lo\./;

        const match = line.match(pattern);

        if (match) {
            const contactName = match[1];
            const numbers = match[2];
            const sender = match[3];
            const acceptCommand = match[4];

            return '<span class="green">[INFO]</span> <span class="white">Você recebeu um contato (' + contactName + ', ' + numbers + ') de ' + sender + '. Use ' + acceptCommand + ' para aceitá-lo.</span>';
        } else {
            return line;
        }
    }

    function applyContactShareFormatting(line) {
        const pattern = /\[INFO\] YVocê recebeu um contato \((.+), ([^\)]+)\) from (.+)\. Use (\/aceitarnumero) para aceitá-lo\./;

        const match = line.match(pattern);

        if (match) {
            const contactName = match[1];
            const numbers = match[2];
            const sender = match[3];
            const acceptCommand = match[4];

            return '<span class="green">[INFO]</span> <span class="white">YVocê recebeu um contato (' + contactName + ', ' + numbers + ') de ' + sender + '. Use ' + acceptCommand + ' para aceitá -lo.</span>';
        } else {
            return line;
        }
    }

    function applyNumberShareFormatting(line) {
        const pattern = /\[INFO\] Você compartilhou seu número com (.+) sob o nome (.+)\./;

        const match = line.match(pattern);

        if (match) {
            const receiver = match[1];
            const name = match[2];

            return '<span class="green">[INFO]</span> <span class="white">Você compartilhou seu número com ' + receiver + ' sob o nome ' + name + '.</span>';
        } else {
            return line;
        }
    }

    function applyContactSharedFormatting(line) {
        const pattern = /\[INFO\] Você compartilhou (.+) \(([^\)]+)\) com (.+)\./;

        const match = line.match(pattern);

        if (match) {
            const contactName = match[1];
            const numbers = match[2];
            const receiver = match[3];

            return '<span class="green">[INFO]</span> <span class="white">Você compartilhou ' + contactName + ' (' + numbers + ') com ' + receiver + '.</span>';
        } else {
            return line;
        }
    }

    function formatVesselTraffic(line) {
        const vesselTrafficPattern = /\*\*\s*\[CH: VTS - Vessel Traffic Service\]/;

        if (vesselTrafficPattern.test(line)) {
            return `<span class="vesseltraffic">${line}</span>`;
        }

        return line;
    }

    function formatIntercom(line) {
        return line.replace(
            /\[(.*?) intercom\]: (.*)/i,
            '<span class="blue">[$1 Intercom]: $2</span>'
        );
    }

    function formatPhoneCursor(line) {
        return '<span class="white">Use <span class="yellow">/phonecursor (/pc)</span> para ativar o cursor e usar o telefone.</span>';
    }
    
    function formatShown(line) {
        return `<span class="green">${line.replace(
            /their (.+)\./,
            'seu <span class="white">$1</span>.'
        )}</span>`;
    }
    
    function replaceColorCodes(str) {
        return str
            .replace(
                /\{([A-Fa-f0-9]{6})\}/g,
                (_match, p1) => '<span style="color: #' + p1 + ';">'
            )
            .replace(/\{\/([A-Fa-f0-9]{6})\}/g, "</span>");
    }
    
    function colorMoneyLine(line) {
        return line.replace(
            /Você recebeu (\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?) de (.+) em sua conta bancária\./,
            '<span class="white">Você recebeu </span><span class="green">$1</span><span class="white"> de </span><span class="white">$2</span><span class="white"> em sua conta bancária.</span>'
        );
    }
      
    
    function colorLocationLine(line) {
        return line.replace(
            /(Você recebeu uma localização de) (#\d+)(. Use )(\/removelocation)( para excluir o marcador\.)/,
            '<span class="green">$1 </span>' +
            '<span class="yellow">$2</span>' +
            '<span class="green">$3</span>' +
            '<span class="death">$4</span>' +
            '<span class="green">$5</span>'
        );
    }
    
    function formatRobbery(line) {
        return line
            .replace(/\/arob/, '<span class="blue">/arob</span>')
            .replace(/\/report/, '<span class="death">/report</span>')
            .replace(
                /Você está sendo roubado, use (.+?) para mostrar seu inventário/,
                '<span class="white">Você está sendo roubado, use </span>' +
                '<span class="blue">$1</span>' +
                '<span class="white"> para mostrar seu inventário</span>'
            );
    }   
    
    function formatCharacterKill(line) {
        return (
            '<span class="blue">[Character Kill]</span> <span class="death">' +
            line.slice(16) +
            "</span>"
        );
    }
    
    function formatDrugCut(line) {
        const drugCutPattern = /Você cortou (.+?) x(\d+) em x(\d+)\./i;
        const match = line.match(drugCutPattern);
    
        if (match) {
            const drugName = match[1];
            const firstAmount = match[2];
            const secondAmount = match[3];
    
            return (
                `<span class="white">Você cortou </span>` +
                `<span class="blue">${drugName}</span>` +
                `<span class="blue"> x${firstAmount}</span>` +
                `<span class="white"> em </span><span class="blue">x${secondAmount}</span>` +
                `<span class="blue">.</span>`
            );
        }
        return line;
    }
    
    function formatDrugEffect(line) {
        const pattern = /Você acabou de tomar (.+?)! Você sentirá os efeitos da droga em breve\./;
        const match = line.match(pattern);
    
        if (match) {
            const drugName = match[1];
            return `<span class="white">Você acabou de tomar </span><span class="green">${drugName}</span><span class="white">! Você sentirá os efeitos da droga em breve.</span>`;
        }
    
        return line;
    }
    
    function formatPrisonPA(line) {
        const pattern = /^\*\* \[PRISÃO PA\].*\*\*$/;
        if (pattern.test(line)) {
            return `<span class="blue">${line}</span>`;
        }
        return line;
    }
    
    function formatCashTap(line) {
        if (line.includes("[CASHTAP]")) {
            return line
                .replace(
                    /\[CASHTAP\]/g,
                    '<span class="green">[CASHTAP]</span>'
                )
                .replace(
                    /^(.*?)(<span class="green">\[CASHTAP\]<\/span>)(.*)$/,
                    '<span class="white">$1</span>$2<span class="white">$3</span>'
                );
        }
        return line;
    }
    
    function formatCardReader(line) {
        const [prefix, rest] = line.split(":");
        const moneyMatch = rest.match(/\$\d+/);
        const money = moneyMatch ? moneyMatch[0] : "";
    
        if (line.includes("oferece um leitor de cartão")) {
            const nameEnd = rest.indexOf(" oferece");
            const name = rest.substring(0, nameEnd);
    
            return wrapSpan("orange", "Info:") + wrapSpan("yellow", name) + rest.substring(nameEnd, rest.lastIndexOf(money)) + wrapSpan("green", money) + "!";
        }
    
        if (line.includes("passou seu cartão pelo leitor")) {
            const businessStart = rest.indexOf("leitor de ") + "leitor de ".length;
            const businessEnd = rest.indexOf(" para um valor de");
            const business = rest.substring(businessStart, businessEnd);
    
            return wrapSpan("orange", "Info:") + rest.substring(0, businessStart) + wrapSpan("yellow", business) + " para um valor de " + wrapSpan("green", money) + "!";
        }
    
        if (line.includes("ofereceu seu leitor de cartão para")) {
            const nameStart = rest.indexOf("leitor para ") + "leitor para ".length;
            const nameEnd = rest.indexOf(" para um valor de");
            const name = rest.substring(nameStart, nameEnd);
    
            return wrapSpan("orange", "Info:") + rest.substring(0, nameStart) + wrapSpan("yellow", name) + " para um valor de " + wrapSpan("green", money) + ". Aguarde a aceitação!";
        }
    
        if (line.includes("aceitou o pagamento do cartão de")) {
            const nameStart = rest.indexOf("pagamento de ") + "pagamento de ".length;
            const nameEnd = rest.indexOf(" para um valor de");
            const name = rest.substring(nameStart, nameEnd);
    
            return wrapSpan("orange", "Info:") + rest.substring(0, nameStart) + wrapSpan("yellow", name) + " para um valor de " + wrapSpan("green", money) + "!";
        }
    }    

    function addLineBreaksAndHandleSpans(text) {
        const maxLineLength = document.getElementById("lineLengthInput").value;
        let result = "";
        let currentLineLength = 0;
        let inSpan = false;
        let currentSpan = "";

        function addLineBreak() {
            if (inSpan) {
                const spanClassMatch = currentSpan.match(/class="([^"]+)"/);
                const spanClass = spanClassMatch ? spanClassMatch[1] : "";
                result += `</span><br><span class="${spanClass}">`;
            } else {
                result += "<br>";
            }
            currentLineLength = 0;
        }

        for (let i = 0; i < text.length; i++) {
            if (text[i] === "<" && text.substr(i, 5) === "<span") {
                let spanEnd = text.indexOf(">", i);
                currentSpan = text.substring(i, spanEnd + 1);
                i = spanEnd;
                inSpan = true;
                result += currentSpan;
            } else if (text[i] === "<" && text.substr(i, 7) === "</span>") {
                inSpan = false;
                result += "</span>";
                i += 6;
            } else {
                result += text[i];
                currentLineLength++;

                if (currentLineLength >= maxLineLength && text[i] === " ") {
                    addLineBreak();
                }
            }
        }

        return result;
    }

    function cleanUp() {
        $output.find(".generated").each(function() {
            let html = $(this).html();
            html = html.replace(/<br>\s*<br>/g, "<br>");
            html = html.replace(/^<br>|<br>$/g, "");
            html = html.replace(/<span[^>]*>\s*<\/span>/g, "");
            $(this).html(html);
        });
        applyStyles();
    }

    function applyStyles() {
        $(".generated:first").css({
            "margin-top": "0",
            "padding-top": "1px",
        });
        $(".generated:last").css({
            "padding-bottom": "1px",
            "margin-bottom": "0",
        });
        $(".generated").css("background-color", "transparent");

        if (applyBackground) {
            $(".generated").css("background-color", "#000000");
        }
    }

    processOutput();
});